// C:\Users\vizir\VizirPro\app\api\distribution\route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateDistributionStrategy } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = String(body?.title || "").trim();
  const logline = String(body?.logline || "").trim();
  const synopsis = String(body?.synopsis || "").trim();
  const genre = String(body?.genre || "").trim() || "drama";
  const length = String(body?.length || "").trim();
  const themes = Array.isArray(body?.themes)
    ? body.themes.filter((t: any) => typeof t === "string")
    : [];
  const budgetTier = String(body?.budgetTier || "indie") as any;

  if (!logline && !synopsis) {
    return NextResponse.json(
      { error: "Provide at least a logline or synopsis before generating a distribution strategy." },
      { status: 400 },
    );
  }

  try {
    const distribution = await generateDistributionStrategy({
      title,
      logline,
      synopsis,
      genre,
      length,
      themes,
      budgetTier,
    });
    if (!distribution) {
      return NextResponse.json(
        { error: "Distribution strategy generation returned no data. Try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ distribution });
  } catch (err: any) {
    console.error("Distribution strategy generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Distribution strategy generation failed" },
      { status: 500 },
    );
  }
}
