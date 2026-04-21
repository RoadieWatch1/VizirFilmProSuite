// C:\Users\vizir\VizirPro\app\api\social\route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateSocialPackage } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

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
  const themes = Array.isArray(body?.themes)
    ? body.themes.filter((t: any) => typeof t === "string")
    : [];
  const targetAudience = String(body?.targetAudience || "").trim();
  const releaseStage = String(body?.releaseStage || "production") as any;

  if (!logline && !synopsis) {
    return NextResponse.json(
      { error: "Provide at least a logline or synopsis before generating social content." },
      { status: 400 },
    );
  }

  try {
    const socialPackage = await generateSocialPackage({
      logline,
      synopsis,
      genre,
      themes,
      title,
      targetAudience,
      releaseStage,
    });
    if (!socialPackage) {
      return NextResponse.json(
        { error: "Social package generation returned no data. Try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ socialPackage });
  } catch (err: any) {
    console.error("Social package generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Social package generation failed" },
      { status: 500 },
    );
  }
}
