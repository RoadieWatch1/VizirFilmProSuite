// /app/api/storyboard+api.ts

import OpenAI from "openai";

interface StoryboardRequestBody {
  sceneText: string;
  genre: string;
  numberOfShots?: number;
  provider?: "openai" | "replicate";
}

interface Shot {
  shot_number: number;
  shot_type: string;
  description: string;
  lens_angle: string;
  movement: string;
  lighting_setup: string;
  image?: string;
}

export async function POST(request: Request): Promise<Response> {
  const requestId = Math.random().toString(36).substring(2, 10);

  try {
    const body = (await request.json()) as StoryboardRequestBody;
    const {
      sceneText,
      genre,
      numberOfShots = 10,
      provider = "openai",
    } = body;

    console.log(`[${requestId}] Storyboard request.`, body);

    if (!sceneText || !genre) {
      return jsonError("Missing scene text or genre.", 400, requestId);
    }

    // Generate list of shots via GPT-4
    const shotsData = await generateShotList(
      sceneText,
      genre,
      numberOfShots,
      requestId
    );

    if (!shotsData || shotsData.length === 0) {
      console.warn(`[${requestId}] No shots from AI. Returning fallback.`);
      return new Response(
        JSON.stringify({
          shots: [
            {
              shot_number: 1,
              shot_type: "Wide Shot",
              description: "A placeholder scene. A figure stands in an empty street.",
              lens_angle: "35mm",
              movement: "Static",
              lighting_setup: "Soft daylight",
              image: "https://placehold.co/1024x1024?text=Storyboard+Image",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const shotsWithImages: Shot[] = [];

    for (const shot of shotsData) {
      let imageUrl: string | null = null;

      if (provider === "replicate") {
        imageUrl = await generateReplicateImage(shot, genre, requestId);
      } else {
        imageUrl = await generateOpenAIImage(shot, genre, requestId);
      }

      shotsWithImages.push({
        ...shot,
        image:
          imageUrl ||
          "https://placehold.co/1024x1024?text=Storyboard+Image",
      });
    }

    return jsonOK({ shots: shotsWithImages }, requestId);
  } catch (error) {
    console.error(`[${requestId}] Storyboard API Error:`, error);
    return jsonError("Internal Server Error.", 500, requestId);
  }
}

async function generateShotList(
  sceneText: string,
  genre: string,
  numberOfShots: number,
  requestId: string
): Promise<Shot[]> {
  console.log(`[${requestId}] Generating shot list...`);

  const prompt = `
You are a professional storyboard artist.

Analyze the following scene and produce exactly ${numberOfShots} storyboard frames.

Important constraints:
- Do NOT mention cameras, crew, movie sets, or filmmaking jargon.
- Each shot must include:
    - shot_number
    - shot_type (e.g. "Wide Shot", "Close-Up", etc.)
    - description (1-2 sentences of visible action and environment)
    - lens_angle (e.g. "35mm, eye level")
    - movement (e.g. "Slow dolly in")
    - lighting_setup (e.g. "Soft window light from camera left")

Respond ONLY as valid JSON like:

{
  "shots": [
    {
      "shot_number": 1,
      "shot_type": "Wide Shot",
      "description": "A dark beach under moonlight where a lone man stands staring into the waves.",
      "lens_angle": "35mm, eye level",
      "movement": "Slow push in",
      "lighting_setup": "Moonlight casting deep shadows on the sand"
    }
  ]
}

SCENE: ${sceneText}
`;

  const aiResponse = await callOpenAI(prompt, requestId);

  try {
    const parsed = JSON.parse(aiResponse);
    console.log(`[${requestId}] Parsed shots:`, parsed);
    return parsed.shots || [];
  } catch (e) {
    console.warn(
      `[${requestId}] Failed to parse JSON. Raw:\n${aiResponse}`
    );
    return [];
  }
}

async function generateOpenAIImage(
  shot: Shot,
  genre: string,
  requestId: string
): Promise<string | null> {
  console.log(`[${requestId}] Generating OpenAI image for shot ${shot.shot_number}.`);

  try {
    const OPENAI_API_KEY =
      process.env.OPENAI_API_KEY ||
      process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error(`[${requestId}] Missing OpenAI API key.`);
      return null;
    }

    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    let imagePrompt = `
Professional black and white pencil storyboard drawing.
No cameras, no film crew, no movie equipment visible.
Square format. Realistic style.
Only show characters, environment, atmosphere, and actions visible to an audience.
Drawing style: pencil, high detail, no color.

Depict this:

${shot.description}
`;

    if (genre.toLowerCase() === "horror") {
      imagePrompt += `
Avoid graphic violence or gore. Use subtle horror elements.
`;
    }

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt.trim(),
      n: 1,
      size: "1024x1024",
    });

    const url: string | null = imageResponse.data?.[0]?.url ?? null;

    if (!url) {
      console.warn(`[${requestId}] No image URL from DALL·E.`);
      return null;
    }

    console.log(`[${requestId}] DALL·E image URL: ${url}`);
    return url;
  } catch (error: any) {
    console.error(`[${requestId}] OpenAI image error:`, error);
    return null;
  }
}

async function generateReplicateImage(
  shot: Shot,
  genre: string,
  requestId: string
): Promise<string | null> {
  console.log(`[${requestId}] Generating SDXL image for shot ${shot.shot_number}.`);

  try {
    const replicateApiKey = process.env.REPLICATE_API_KEY;

    if (!replicateApiKey) {
      console.error(`[${requestId}] Missing Replicate API key.`);
      return null;
    }

    const prompt = `
Professional black and white pencil storyboard drawing.
No cameras or film crew.
Square aspect ratio. Realistic style.
Characters, environment, atmosphere, and action only.

Depict this:

${shot.description}
`;

    const response = await fetch(
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
            prompt: prompt.trim(),
            width: 1024,
            height: 1024,
            num_outputs: 1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[${requestId}] Replicate error:`, errText);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.output?.[0] || null;

    console.log(`[${requestId}] SDXL image URL:`, imageUrl);
    return imageUrl;
  } catch (e) {
    console.error(`[${requestId}] Replicate error:`, e);
    return null;
  }
}

async function callOpenAI(
  prompt: string,
  requestId: string
): Promise<string> {
  const OPENAI_API_KEY =
    process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key.");
  }

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are a professional storyboard artist. Respond ONLY in JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.5,
    max_tokens: 2000,
  });

  return completion.choices?.[0]?.message?.content || "";
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
