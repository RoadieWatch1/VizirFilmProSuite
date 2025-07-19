import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Define BudgetCategory type for TypeScript
interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  items?: string[];
  tips?: string[];
  alternatives?: string[];
}

async function callOpenAI(prompt: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional film budgeting assistant. You generate detailed budget breakdowns for film productions, including cost-saving tips for low-budget filmmakers.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0].message.content;
}

async function generateBudget(
  movieGenre: string,
  scriptLength: string,
  lowBudgetMode: boolean
) {
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
    },
    ...
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

${lowBudgetMode ? 
`If lowBudgetMode is true:
- Reduce all amounts by approximately 50%.
- Add cost-saving tips for each category.
- Suggest cheaper alternatives for each category.` 
: 
`If lowBudgetMode is false:
- Provide standard industry costs.
- Tips and alternatives can be empty arrays if not applicable.`}
`;

  const result = await callOpenAI(prompt);

  // ✅ Log raw GPT result
  console.log("🟠 RAW GPT result:", result);

  let parsed;

  try {
    // ✅ Extract JSON safely in case GPT adds text around it
    const jsonMatch = result && result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
      console.log("🟢 Extracted JSON from GPT:", parsed);
    } else {
      console.error("⚠️ No JSON found in GPT result. Full text:", result);
      parsed = { categories: [] };
    }
  } catch (e) {
    console.error("Failed to parse budget JSON:", e, result);
    parsed = { categories: [] };
  }

  // ✅ Add missing fields if they were omitted
  if (parsed.categories) {
    parsed.categories = parsed.categories.map((cat: BudgetCategory) => ({
      ...cat,
      items: cat.items || [],
      tips: cat.tips || [],
      alternatives: cat.alternatives || [],
    }));
  }

  if (lowBudgetMode && parsed.categories) {
    parsed.categories = parsed.categories.map((cat: BudgetCategory) => ({
      ...cat,
      amount: Math.round(cat.amount * 0.5),
    }));
    console.log("🟡 Low-budget adjusted categories:", parsed.categories);
  }

  // ✅ Final check before sending back to frontend
  console.log("✅ FINAL PARSED BUDGET OBJECT:", JSON.stringify(parsed, null, 2));

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      movieGenre,
      scriptLength,
      lowBudgetMode = false,
    } = body;

    if (!movieGenre || !scriptLength) {
      return NextResponse.json(
        { error: "Movie genre and script length are required." },
        { status: 400 }
      );
    }

    const budgetResult = await generateBudget(
      movieGenre,
      scriptLength,
      lowBudgetMode
    );

    return NextResponse.json(budgetResult);
  } catch (error: any) {
    console.error("Budget generation error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to generate budget. Please try again later.",
      },
      { status: 500 }
    );
  }
}
