// C:\Users\vizir\VizirFilmProSuite\app\api\sound+api.ts

import OpenAI from "openai";

export const dynamic = "force-dynamic";

interface SoundPlan {
  overallStyle: string;
  musicGenres: string[];
  keyEffects: string[];
  notableMoments: Array<{
    scene: string;
    soundDesign: string;
  }>;
}

interface SoundResponse {
  soundPlan: SoundPlan;
}

export async function POST(request: Request): Promise<Response> {
  const requestId = Math.random().toString(36).substring(2, 10);

  try {
    const body = await request.json();
    const { movieIdea, movieGenre } = body;

    console.log(`[${requestId}] Sound API called.`);

    if (!movieIdea || !movieGenre) {
      return jsonError("Missing movie idea or genre.", 400, requestId);
    }

    const prompt = `
You are a professional film sound designer.

Create a sound design plan for a ${movieGenre} movie with the following idea:

"${movieIdea}"

Respond ONLY in valid JSON like this:

{
  "soundPlan": {
    "overallStyle": "...",
    "musicGenres": ["...", "..."],
    "keyEffects": ["...", "..."],
    "notableMoments": [
      {
        "scene": "...",
        "soundDesign": "..."
      }
    ]
  }
}
`;

    const aiResponse = await callOpenAI(prompt, requestId);

    const cleanedResponse = stripCodeBlock(aiResponse);

    let parsed: SoundResponse | null = null;

    try {
      parsed = JSON.parse(cleanedResponse);

      if (!parsed?.soundPlan) {
        console.error(
          `[${requestId}] AI returned unexpected JSON structure.`
        );
        return jsonError(
          "AI returned unexpected JSON structure.",
          500,
          requestId
        );
      }
    } catch (e) {
      console.error(
        `[${requestId}] Failed to parse JSON:\n${cleanedResponse}`
      );
      return jsonError("Failed to parse AI response.", 500, requestId);
    }

    // log the result in readable format
    console.log(
      `[${requestId}] Sound result:\n${JSON.stringify(parsed, null, 2)}`
    );

    // ensure notableMoments is always an array
    if (!Array.isArray(parsed.soundPlan.notableMoments)) {
      parsed.soundPlan.notableMoments = [];
    }

    return jsonOK(parsed, requestId);
  } catch (error) {
    console.error(`[${requestId}] Sound API error:`, error);
    return jsonError("Internal Server Error", 500, requestId);
  }
}

async function callOpenAI(
  prompt: string,
  requestId: string
): Promise<string> {
  const OPENAI_API_KEY =
    process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error(`[${requestId}] Missing OpenAI API key.`);
    return "";
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
          "You are a film sound designer who responds ONLY in JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const text = completion.choices[0].message.content || "";

  console.log(`[${requestId}] OpenAI raw response:\n${text}`);

  return text;
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
    }
  );
}
