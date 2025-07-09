export const dynamic = "force-dynamic";

interface GenerateRequestBody {
  movieIdea: string;
  movieGenre: string;
  scriptLength: string;
  step?: string;
  provider?: "openai" | "replicate";
  customPrompt?: string;
  requestId?: string;
  resolution?: string;
  shotCount?: number;
}

export async function POST(request: Request): Promise<Response> {
  const requestId = Date.now().toString();

  try {
    const body = (await request.json()) as GenerateRequestBody;

    const {
      movieIdea,
      movieGenre,
      scriptLength,
      step,
      provider = "openai",
      customPrompt,
      resolution = "1024x1024",
      shotCount = 1,
    } = body;

    if (!movieIdea || !movieGenre || !scriptLength) {
      return jsonError("Missing required fields.", 400, requestId);
    }

    if (step) {
      const stepResult = await handleStep(
        step,
        movieIdea,
        movieGenre,
        scriptLength,
        provider,
        customPrompt,
        resolution,
        shotCount,
        requestId
      );

      if (step === "script" && typeof stepResult === "object" && "script" in stepResult) {
        return jsonOK({ script: stepResult.script }, requestId);
      }

      return jsonOK({ [step]: stepResult }, requestId);
    }

    // Default full script generation
    const script = await generateFullScript(
      movieIdea,
      movieGenre,
      scriptLength,
      requestId
    );

    return jsonOK(
      {
        movieIdea,
        movieGenre,
        scriptLength,
        script,
      },
      requestId
    );
  } catch (e) {
    console.error(`[${requestId}] API error:`, e);
    return jsonError(
      e instanceof Error ? e.message : "Internal Server Error",
      500,
      requestId
    );
  }
}

async function generateFullScript(
  movieIdea: string,
  genre: string,
  length: string,
  requestId: string
): Promise<string> {
  const prompt = `
Write a full ${length} screenplay for a ${genre} film titled "${movieIdea}".

Format it as a professional movie script, including proper scene headings like:
- FADE IN:
- INT.
- EXT.
- FADE OUT.

Write dialogue and action lines. Do NOT include explanations, analysis, or lists outside the script itself. Output only the script text.

IMPORTANT:
- Limit the script to around 3,000 words maximum so it fits into a single API context.
`;

  const result = await callOpenAI(prompt, requestId);
  return result.trim();
}

async function handleStep(
  step: string,
  movieIdea: string,
  genre: string,
  length: string,
  provider: "openai" | "replicate",
  customPrompt: string | undefined,
  resolution: string,
  shotCount: number,
  requestId: string
): Promise<string | object> {
  console.log(`[${requestId}] Generating step: ${step}`);

  let prompt = "";

  switch (step) {
    case "logline":
      prompt = `Write only a logline in one sentence for a ${length} ${genre} film titled "${movieIdea}". Respond as JSON: { "logline": "..." }`;
      break;

    case "synopsis":
      prompt = `Write a detailed synopsis (2-3 paragraphs) for a ${length} ${genre} film titled "${movieIdea}". Respond as JSON: { "synopsis": "..." }`;
      break;

    case "themes":
      prompt = `List 3 core themes for a ${length} ${genre} film titled "${movieIdea}". Respond as JSON: { "themes": ["...", "...", "..."] }`;
      break;

    case "characters":
      prompt = `List ALL characters appearing in a ${length} ${genre} film titled "${movieIdea}". For each character, provide:
- name
- a short description

Respond ONLY as valid JSON like:
{
  "characters": [
    { "name": "John Smith", "description": "A detective in his 40s, gruff but clever." },
    { "name": "Jane Doe", "description": "A young hacker with a mysterious past." }
  ]
}`;
      break;

    case "scenes":
      prompt = `List all individual scenes for a ${length} ${genre} film titled "${movieIdea}". Respond only as valid JSON:

{
  "scenes": [
    {
      "scene_number": 1,
      "description": "Description of the scene's key visuals and actions."
    }
  ]
}`;
      break;

    case "script":
      prompt = `Write a short screenplay (2-3 scenes) for "${movieIdea}" in the ${genre} genre. Respond as JSON: { "script": "..." }`;
      break;

    case "concept":
      prompt = `Write a concise concept description for a ${length} ${genre} film titled "${movieIdea}". Respond as JSON: { "concept": "..." }`;
      break;

    case "storyboardStyle":
      prompt = `Describe the best visual style for storyboards of a ${genre} film titled "${movieIdea}". Emphasize:
- black and white
- pencil sketches
- cinematic detail
- square aspect ratio (1:1)

Respond as JSON:
{ "style": "..." }`;
      break;

    case "proStoryboardImage":
      if (!customPrompt) {
        throw new Error("Missing custom prompt for Pro image.");
      }

      // generate multiple images one at a time
      const images: string[] = [];

      for (let i = 0; i < shotCount; i++) {
        console.log(`[${requestId}] Generating image ${i + 1} of ${shotCount}...`);

        let imageUrl = "";

        if (provider === "replicate") {
          const replicateUrls = await callStableDiffusion(customPrompt, resolution, requestId);
          imageUrl = replicateUrls[0] || "";
        } else {
          imageUrl = await callOpenAIImage(customPrompt, resolution, requestId);
        }

        images.push(imageUrl);
      }

      return {
        resolution,
        images,
      };

    default:
      throw new Error(`Unknown generation step: ${step}`);
  }

  const aiResponse = await callOpenAI(prompt, requestId);
  const cleanResponse = stripCodeBlock(aiResponse);

  try {
    const parsed = JSON.parse(cleanResponse);
    console.log(`[${requestId}] Step ${step} result:`, parsed);

    if (step === "script" && parsed?.script) {
      return parsed.script;
    }

    return parsed[step] ?? parsed;
  } catch (e) {
    console.warn(
      `[${requestId}] Failed to parse JSON for step ${step}. Response:\n${aiResponse}`
    );
    return aiResponse;
  }
}

async function callOpenAI(
  prompt: string,
  requestId: string
): Promise<string> {
  const OPENAI_API_KEY =
    process.env.OPENAI_API_KEY ||
    process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key.");
  }

  const payload = {
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are an expert film screenwriter and respond ONLY in JSON or plain text as instructed.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  };

  const completion = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!completion.ok) {
    const errorText = await completion.text();
    console.error(`[${requestId}] OpenAI error:`, errorText);
    throw new Error("OpenAI API error.");
  }

  const data = await completion.json();
  const text = data.choices?.[0]?.message?.content || "";
  return text;
}

async function callOpenAIImage(
  prompt: string,
  resolution: string,
  requestId: string
): Promise<string> {
  const OPENAI_API_KEY =
    process.env.OPENAI_API_KEY ||
    process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  const payload = {
    model: "dall-e-3",
    prompt,
    n: 1,
    size: resolution,
  };

  const completion = await fetch(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!completion.ok) {
    const errorText = await completion.text();
    console.error(`[${requestId}] OpenAI Image error:`, errorText);
    throw new Error("OpenAI Image API error.");
  }

  const data = await completion.json();
  const imageUrl = data.data?.[0]?.url;
  return imageUrl;
}

async function callStableDiffusion(
  prompt: string,
  resolution: string,
  requestId: string
): Promise<string[]> {
  const replicateApiKey = process.env.REPLICATE_API_KEY;
  if (!replicateApiKey) {
    throw new Error("Missing Replicate API key.");
  }

  const [width, height] = resolution.split("x").map(Number);

  const replicateResponse = await fetch(
    "https://api.replicate.com/v1/predictions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${replicateApiKey}`,
      },
      body: JSON.stringify({
        version: "stability-ai/sdxl:latest",
        input: {
          prompt,
          width: width || 512,
          height: height || 512,
          num_outputs: 1,
        },
      }),
    }
  );

  if (!replicateResponse.ok) {
    const errorText = await replicateResponse.text();
    console.error(`[${requestId}] Replicate error:`, errorText);
    throw new Error("Replicate API error.");
  }

  const data = await replicateResponse.json();
  return data.output || [];
}

function stripCodeBlock(raw: string): string {
  return raw
    .trim()
    .replace(/^```[a-zA-Z]*\n/, "")
    .replace(/```$/, "")
    .trim();
}

function jsonOK(data: any, requestId: string) {
  return new Response(
    JSON.stringify({
      requestId,
      ...data,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

function jsonError(
  errorMsg: string,
  status: number,
  requestId: string
) {
  return new Response(
    JSON.stringify({
      requestId,
      error: errorMsg,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
