// C:\Users\vizir\VizirFilmProSuite\app\api\locations+api.ts

import OpenAI from "openai";

export const dynamic = "force-dynamic";

interface Location {
  name: string;
  description: string;
}

interface LocationsResponse {
  locations: Location[];
}

export async function POST(request: Request): Promise<Response> {
  const requestId = Math.random().toString(36).substring(2, 10);

  try {
    const body = await request.json();
    const { movieIdea, movieGenre } = body;

    console.log(`[${requestId}] Locations API called.`);

    if (!movieIdea || !movieGenre) {
      return jsonError("Missing movie idea or genre.", 400, requestId);
    }

    const prompt = `
You are an experienced film location scout.

Generate a list of 5 diverse TYPES of filming locations suitable for a ${movieGenre} film based on this movie idea:

"${movieIdea}"

DO NOT list real-world cities or specific famous places.

Instead, describe TYPES of locations like:
- abandoned warehouse
- suburban house interior
- busy highway overpass
- quiet forest trail
- crowded subway train
- luxurious rooftop bar
- dark narrow alley
- cozy small-town diner
- futuristic laboratory
- stormy beach
- vintage bus interior
- neon-lit arcade

For each location, provide:
- name: a creative label for the type of location (e.g. "Abandoned Warehouse" or "Vintage Train Car")
- description: 1-2 sentences describing what the space looks and feels like, including:
  - atmosphere
  - size
  - lighting
  - typical sounds
  - mood or feeling it evokes

Respond ONLY in valid JSON like this:

{
  "locations": [
    {
      "name": "Abandoned Warehouse",
      "description": "A cavernous, dusty space filled with towering metal beams, broken windows letting shafts of light pierce the gloom, creating dramatic shadows. The echo of dripping water adds to the haunting silence."
    }
  ]
}
`;

    const aiResponse = await callOpenAI(prompt, requestId);

    let parsed: LocationsResponse | null = null;

    try {
      parsed = JSON.parse(stripCodeBlock(aiResponse));
    } catch (e) {
      console.error(`[${requestId}] Failed to parse JSON:\n${aiResponse}`);
      return jsonError("Failed to parse AI response.", 500, requestId);
    }

    console.log(`[${requestId}] Locations result:`, parsed);

    return jsonOK(parsed, requestId);
  } catch (error) {
    console.error(`[${requestId}] Locations API error:`, error);
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
    apiKey: OPENAI_API_KEY
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: "You are an expert film location scout who responds ONLY in JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7
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
      ...data
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
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
      error: errorMsg
    }),
    {
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
}
