// C:\Users\vizir\VizirPro\app\api\coverage\route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateScriptCoverage } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MIN_SCRIPT_CHARS = 500;

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const script = String(body?.script || "").trim();
  const genre = String(body?.genre || "").trim() || "drama";
  const title = String(body?.title || "").trim();
  const logline = String(body?.logline || "").trim();

  if (!script) {
    return NextResponse.json({ error: "script is required" }, { status: 400 });
  }
  if (script.length < MIN_SCRIPT_CHARS) {
    return NextResponse.json(
      { error: "Script is too short for meaningful coverage. Write or generate at least a few pages first." },
      { status: 400 },
    );
  }

  try {
    const coverage = await generateScriptCoverage(script, genre, { title, logline });
    if (!coverage) {
      return NextResponse.json(
        { error: "Coverage generation returned no data. Try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ coverage });
  } catch (err: any) {
    console.error("Coverage generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Coverage generation failed" },
      { status: 500 },
    );
  }
}
