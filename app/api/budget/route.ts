// C:\Users\vizir\VizirPro\app\api\budget\route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// ✅ Helps avoid build crash + keeps consistent with your other routes:
// - Do NOT instantiate OpenAI at module load.
// - Lazily init at runtime when the route is called.
// - Guard against accidental client-side import.
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (typeof window !== "undefined") {
    throw new Error("app/api/budget/route.ts must only run on the server.");
  }
  if (_openai) return _openai;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it in Vercel Project Settings → Environment Variables (Production + Preview)."
    );
  }

  _openai = new OpenAI({ apiKey });
  return _openai;
}

// ✅ Use your Vercel env vars (match what you configured)
const MODEL_JSON =
  process.env.OPENAI_MODEL_JSON || "gpt-4o-mini";
const DEFAULT_JSON_CALL_TIMEOUT_MS = parseInt(process.env.DEFAULT_JSON_CALL_TIMEOUT_MS || "60000", 10);

// ✅ Define BudgetCategory type for TypeScript
interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  items?: string[];
  tips?: string[];
  alternatives?: string[];
}

function stripCodeFences(s: string) {
  let t = (s ?? "").trim();
  if (t.startsWith("```json")) t = t.slice(7).trim();
  if (t.startsWith("```")) t = t.slice(3).trim();
  if (t.endsWith("```")) t = t.slice(0, -3).trim();
  return t;
}

function looksTruncatedJson(raw: string) {
  const t = (raw ?? "").trim();
  if (!t) return false;

  if (t.startsWith("{") && !t.endsWith("}")) return true;
  if (t.startsWith("[") && !t.endsWith("]")) return true;

  const opens = (t.match(/{/g) || []).length;
  const closes = (t.match(/}/g) || []).length;
  if (opens > closes) return true;

  const opensA = (t.match(/\[/g) || []).length;
  const closesA = (t.match(/\]/g) || []).length;
  if (opensA > closesA) return true;

  return false;
}

function safeParseJson<T = any>(raw: string, tag = "json"): T | null {
  try {
    const cleaned = stripCodeFences(String(raw ?? ""));
    if (looksTruncatedJson(cleaned)) {
      console.error(`safeParseJson failed [${tag}] likely truncated len=${cleaned.length}`);
      return null;
    }
    return JSON.parse(cleaned) as T;
  } catch (e) {
    const str = stripCodeFences(String(raw ?? ""));
    const i = str.indexOf("{");
    const j = str.lastIndexOf("}");
    if (i >= 0 && j > i) {
      const candidate = str.slice(i, j + 1).trim();
      if (!looksTruncatedJson(candidate)) {
        try {
          return JSON.parse(candidate) as T;
        } catch {}
      }
    }
    console.error(`safeParseJson failed [${tag}] len=${raw?.length}`, e);
    return null;
  }
}

async function callOpenAIJson(prompt: string): Promise<{ content: string; finish_reason: string }> {
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create(
    {
      model: MODEL_JSON,
      messages: [
        {
          role: "system",
          content:
            "You are a professional film budgeting assistant. Return ONLY valid JSON. No markdown. No commentary.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      // ✅ Do NOT set temperature here — avoids models that restrict temperature
      // ✅ Do NOT set max_tokens — newer models prefer max_completion_tokens (and your other file already handles this)
      // If needed later, add max_completion_tokens safely.
    },
    {
      timeout: DEFAULT_JSON_CALL_TIMEOUT_MS,
      maxRetries: 0,
    }
  );

  const choice = completion.choices?.[0];
  const finish = choice?.finish_reason || "stop";
  const content = stripCodeFences(String(choice?.message?.content ?? "")).trim();

  return { content, finish_reason: finish };
}

async function generateBudget(movieGenre: string, scriptLength: string, lowBudgetMode: boolean) {
  const prompt = `
Generate a professional film budget breakdown for a ${scriptLength} ${movieGenre} film.

Return JSON in this exact format:
{
  "categories": [
    {
      "name": "Category Name",
      "amount": number,
      "percentage": number,
      "items": ["item 1", "item 2"],
      "tips": ["tip 1", "tip 2"],
      "alternatives": ["alternative 1", "alternative 2"]
    }
  ]
}

Estimate realistic costs for:
- Pre-production
- Cast
- Crew
- Locations
- Equipment
- Art Department
- Post-Production
- Music & Sound
- Marketing
- Miscellaneous

Amounts should be in USD.
Percentages should total ~100%.
Keep it concise (max 10 categories).

${lowBudgetMode ? `If lowBudgetMode is true:
- Reduce all amounts by approximately 50%.
- Add cost-saving tips for each category.
- Suggest cheaper alternatives for each category.` : `If lowBudgetMode is false:
- Provide standard industry costs.
- Tips and alternatives can be empty arrays if not applicable.`}
`.trim();

  const { content, finish_reason } = await callOpenAIJson(prompt);

  // ✅ Log raw GPT result
  console.log("🟠 RAW GPT result (finish_reason):", finish_reason);
  console.log("🟠 RAW GPT JSON:", content);

  let parsed: any = safeParseJson(content, "budget-json") || { categories: [] };

  // ✅ Add missing fields if omitted
  if (parsed?.categories && Array.isArray(parsed.categories)) {
    parsed.categories = parsed.categories.map((cat: BudgetCategory) => ({
      ...cat,
      items: Array.isArray(cat.items) ? cat.items : [],
      tips: Array.isArray(cat.tips) ? cat.tips : [],
      alternatives: Array.isArray(cat.alternatives) ? cat.alternatives : [],
    }));
  } else {
    parsed = { categories: [] };
  }

  if (lowBudgetMode && parsed.categories) {
    parsed.categories = parsed.categories.map((cat: BudgetCategory) => ({
      ...cat,
      amount: Math.round((Number(cat.amount) || 0) * 0.5),
    }));
    console.log("🟡 Low-budget adjusted categories:", parsed.categories);
  }

  // ✅ Final check before sending back to frontend
  console.log("✅ FINAL PARSED BUDGET OBJECT:", JSON.stringify(parsed, null, 2));

  return parsed;
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const { movieGenre, scriptLength, lowBudgetMode = false } = body || {};

    if (!movieGenre || !scriptLength) {
      return NextResponse.json(
        { error: "Movie genre and script length are required." },
        { status: 400 }
      );
    }

    const budgetResult = await generateBudget(movieGenre, scriptLength, Boolean(lowBudgetMode));
    return NextResponse.json(budgetResult);
  } catch (error: any) {
    console.error("Budget generation error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate budget. Please try again later.",
      },
      { status: 500 }
    );
  }
}
