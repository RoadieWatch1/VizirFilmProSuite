// C:\Users\vizir\VizirFilmProSuite\app\api\budget+api.ts
export const dynamic = "force-dynamic";

import OpenAI from "openai";

interface BudgetItem {
  name: string;
  cost: number;
}

interface BudgetCategory {
  name: string;
  percentage: number;
  amount: number;
  items: (BudgetItem | string)[];
}

interface BudgetResponse {
  categories: BudgetCategory[];
}

export async function POST(request: Request): Promise<Response> {
  const requestId = Math.random().toString(36).substring(2, 10);

  try {
    const body = await request.json();
    const { genre, scriptLength } = body;

    console.log(`[${requestId}] Budget API called.`);

    if (!genre || !scriptLength) {
      return jsonError("Missing genre or script length.", 400, requestId);
    }

    const prompt = `
You are a professional film line producer.

Generate a realistic production budget for a film with these details:
- Genre: ${genre}
- Script length: ${scriptLength}

The budget should:
- Divide the total cost into categories.
- For each category, provide:
    - name
    - percentage of the total budget
    - amount
    - list of detailed items, each with:
        - item name
        - item cost

Respond ONLY in valid JSON like this:

{
  "categories": [
    {
      "name": "Cast & Crew",
      "percentage": 35,
      "amount": 50000,
      "items": [
        { "name": "Director", "cost": 8000 },
        { "name": "Lead Actor", "cost": 15000 }
      ]
    }
  ]
}
`;

    const aiResponse = await callOpenAI(prompt, requestId);

    const clean = stripCodeBlock(aiResponse);

    let parsed: BudgetResponse | null;

    try {
      parsed = JSON.parse(clean);

      // Handle if AI returns { "budget": [...] } instead of { "categories": [...] }
      if (parsed && "budget" in parsed && !("categories" in parsed)) {
        parsed = {
          categories: (parsed as any).budget,
        };
      }
    } catch (e) {
      console.error(`[${requestId}] Failed to parse JSON:\n${clean}`);
      return jsonError("Failed to parse AI response.", 500, requestId);
    }

    if (!parsed || !parsed.categories) {
      console.error(`[${requestId}] AI returned unexpected JSON structure.`);
      return jsonError(
        "AI returned unexpected JSON structure.",
        500,
        requestId
      );
    }

    console.log(`[${requestId}] Budget result:`, parsed);

    return jsonOK({ categories: parsed.categories }, requestId);
  } catch (error) {
    console.error(`[${requestId}] Budget API error:`, error);
    return jsonError("Internal Server Error", 500, requestId);
  }
}

async function callOpenAI(prompt: string, requestId: string): Promise<string> {
  const openaiApiKey =
    process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.error(`[${requestId}] Missing OpenAI API key.`);
    throw new Error("OpenAI API key is missing.");
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful film line producer who strictly returns JSON responses only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
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

function jsonError(errorMsg: string, status: number, requestId: string) {
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
