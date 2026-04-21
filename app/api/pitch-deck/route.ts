// C:\Users\vizir\VizirPro\app\api\pitch-deck\route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateDirectorStatement } from "@/lib/generators";

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

  const script = String(body?.script || "").trim();
  const logline = String(body?.logline || "").trim();
  const synopsis = String(body?.synopsis || "").trim();
  const genre = String(body?.genre || "").trim() || "drama";
  const title = String(body?.title || "").trim();
  const themes = Array.isArray(body?.themes)
    ? body.themes.filter((t: any) => typeof t === "string")
    : [];

  if (!logline && !synopsis && !script) {
    return NextResponse.json(
      { error: "Provide at least a logline, synopsis, or script." },
      { status: 400 },
    );
  }

  try {
    const directorStatement = await generateDirectorStatement({
      script,
      logline,
      synopsis,
      genre,
      themes,
      title,
    });
    if (!directorStatement) {
      return NextResponse.json(
        { error: "Director statement generation returned no data. Try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ directorStatement });
  } catch (err: any) {
    console.error("Pitch deck generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Pitch deck generation failed" },
      { status: 500 },
    );
  }
}
