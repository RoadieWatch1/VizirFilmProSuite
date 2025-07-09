// C:\Users\vizir\VizirFilmProSuite\app\api\schedule+api.ts

import OpenAI from "openai";

export const dynamic = "force-dynamic";

interface ScheduleItem {
  day: number;
  scenes: string[];
  location: string;
}

interface ScheduleResponse {
  schedule: ScheduleItem[];
}

export async function POST(request: Request): Promise<Response> {
  const requestId = Math.random().toString(36).substring(2, 10);

  try {
    const body = await request.json();
    const { movieIdea, movieGenre, scriptLength } = body;

    console.log(`[${requestId}] Schedule API called.`);

    if (!movieIdea || !movieGenre || !scriptLength) {
      return jsonError("Missing required fields.", 400, requestId);
    }

    const prompt = `
You are an experienced Assistant Director creating film shooting schedules.

Create a realistic schedule for a ${scriptLength} ${movieGenre} film based on this idea:

"${movieIdea}"

Provide a breakdown into DAYS. For each day, list:
- day number
- a list of scenes shot that day (e.g. ["Scene 1", "Scene 2"])
- the primary shooting location

Respond ONLY in valid JSON like this:

{
  "schedule": [
    {
      "day": 1,
      "scenes": ["Scene 1", "Scene 2"],
      "location": "Downtown streets at night"
    }
  ]
}
`;

    const aiResponse = await callOpenAI(prompt, requestId);

    let parsed: ScheduleResponse | null = null;

    try {
      parsed = JSON.parse(aiResponse);
    } catch (e) {
      console.error(`[${requestId}] Failed to parse JSON:\n${aiResponse}`);
      return jsonError("Failed to parse AI response.", 500, requestId);
    }

    console.log(`[${requestId}] Schedule result:`, parsed);

    return jsonOK(parsed, requestId);
  } catch (error) {
    console.error(`[${requestId}] Schedule API error:`, error);
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
    model: "gpt-4-turbo", // ✅ safer choice unless you want gpt-4o
    messages: [
      {
        role: "system",
        content: "You are a professional Assistant Director. Respond ONLY in JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.5
  });

  const text = completion.choices[0].message.content || "";

  console.log(`[${requestId}] OpenAI raw response:\n${text}`);

  return text;
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
