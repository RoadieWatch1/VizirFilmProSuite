// C:\Users\vizir\VizirFilmProSuite\app\api\export+api.ts

import OpenAI from "openai";

export const dynamic = "force-dynamic";

interface ExportPackage {
  projectTitle: string;
  logline: string;
  synopsis: string;
  keyCharacters: string[];
  budgetSummary: string;
  locations: string[];
  soundSummary: string;
  pitchDeckText: string;
}

interface ExportResponse {
  exportPackage: ExportPackage;
}

export async function POST(request: Request): Promise<Response> {
  const requestId = Math.random().toString(36).substring(2, 10);

  try {
    const body = await request.json();
    const filmPackage = body.filmPackage;

    console.log(`[${requestId}] Export API called.`);

    if (!filmPackage || typeof filmPackage !== "object") {
      return jsonError("Missing or invalid filmPackage.", 400, requestId);
    }

    // Basic required fields to make a pitch deck
    if (!filmPackage.idea || !filmPackage.genre || !filmPackage.length) {
      return jsonError(
        "Film package missing required fields (idea, genre, length).",
        400,
        requestId
      );
    }

    const prompt = `
You are an expert film producer preparing a professional pitch deck for investors and studios.

Here is the user's current film project info:

- Project Title: ${filmPackage.idea || "Untitled Project"}
- Genre: ${filmPackage.genre}
- Script Length: ${filmPackage.length}

Other user-generated data:

- Concept: ${filmPackage.concept || "N/A"}
- Logline: ${filmPackage.logline || "N/A"}
- Synopsis: ${filmPackage.synopsis || "N/A"}
- Themes: ${(filmPackage.themes || []).join(", ") || "N/A"}
- Characters: ${(filmPackage.characters || [])
      .map((c: any) => `${c.name}: ${c.description}`)
      .join(" | ") || "N/A"}
- Locations: ${(filmPackage.locations || [])
      .map((l: any) => `${l.name}: ${l.description}`)
      .join(" | ") || "N/A"}
- Budget Summary: ${
      typeof filmPackage.budget === "string"
        ? filmPackage.budget
        : JSON.stringify(filmPackage.budget || [])
    }
- Schedule: ${(filmPackage.schedule || [])
      .map(
        (s: any) =>
          `Day ${s.day} | Scenes: ${s.scenes?.join(", ")} | Location: ${
            s.location
          }`
      )
      .join(" | ") || "N/A"}
- Sound Design: ${
      typeof filmPackage.soundDesign === "string"
        ? filmPackage.soundDesign
        : JSON.stringify(filmPackage.soundDesign || {})
    }
- Storyboard Scenes: ${(filmPackage.storyboard || [])
      .map((s: any) => `Scene ${s.sceneNumber}: ${s.description}`)
      .join(" | ") || "N/A"}

Now generate a single JSON object with:

- Project title
- Logline (1-2 sentences)
- Synopsis (2-3 paragraphs)
- A list of 2-3 key character names
- Short budget summary
- 3 suggested filming locations
- Short sound design summary
- Pitch deck text suitable for a slide deck

Respond ONLY in valid JSON like this:

{
  "exportPackage": {
    "projectTitle": "...",
    "logline": "...",
    "synopsis": "...",
    "keyCharacters": ["...", "..."],
    "budgetSummary": "...",
    "locations": ["...", "..."],
    "soundSummary": "...",
    "pitchDeckText": "..."
  }
}
`;

    const aiResponse = await callOpenAI(prompt, requestId);
    const cleaned = stripCodeBlock(aiResponse);

    let parsed: ExportResponse | null = null;

    try {
      parsed = JSON.parse(cleaned);

      if (!parsed?.exportPackage) {
        console.error(
          `[${requestId}] AI returned unexpected JSON structure:\n${cleaned}`
        );
        return jsonError(
          "AI returned unexpected JSON structure.",
          500,
          requestId
        );
      }
    } catch (e) {
      console.error(`[${requestId}] Failed to parse JSON:\n${cleaned}`);
      return jsonError("Failed to parse AI response.", 500, requestId);
    }

    console.log(`[${requestId}] Export result:`, parsed);

    return jsonOK(parsed, requestId);
  } catch (error) {
    console.error(`[${requestId}] Export API error:`, error);
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
          "You are a film producer who responds ONLY in JSON. No prose or commentary outside JSON format.",
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
