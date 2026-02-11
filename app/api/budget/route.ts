import { NextRequest, NextResponse } from "next/server";
import { generateBudget } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { movieGenre, scriptLength, lowBudgetMode = false } = body || {};

    if (!movieGenre || !scriptLength) {
      return NextResponse.json(
        { error: "Movie genre and script length are required." },
        { status: 400 }
      );
    }

    const result = await generateBudget(movieGenre, scriptLength, Boolean(lowBudgetMode));

    const categories = result?.categories;
    if (!Array.isArray(categories) || categories.length === 0) {
      console.error("Budget generation returned empty categories:", result);
      return NextResponse.json(
        { error: "Failed to generate budget categories. Please try again." },
        { status: 500 }
      );
    }

    // Normalize fields for frontend safety
    const safeCategories = categories.map((cat: any) => ({
      name: typeof cat.name === "string" ? cat.name : "",
      amount: typeof cat.amount === "number" ? cat.amount : 0,
      percentage: typeof cat.percentage === "number" ? cat.percentage : 0,
      items: Array.isArray(cat.items) ? cat.items : [],
      tips: Array.isArray(cat.tips) ? cat.tips : [],
      alternatives: Array.isArray(cat.alternatives) ? cat.alternatives : [],
    }));

    return NextResponse.json(
      { categories: safeCategories },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("Budget generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate budget. Please try again later." },
      { status: 500 }
    );
  }
}
