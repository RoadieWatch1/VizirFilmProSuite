// C:\Users\vizir\VizirPro\app\api\shotlist\route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateShotList } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MIN_SCRIPT_CHARS = 400;

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
  const storyboard = Array.isArray(body?.storyboard) ? body.storyboard : undefined;
  const lowBudget = Boolean(body?.lowBudget);

  if (!script) {
    return NextResponse.json({ error: "script is required" }, { status: 400 });
  }
  if (script.length < MIN_SCRIPT_CHARS) {
    return NextResponse.json(
      { error: "Script is too short for a shot list. Write or generate at least a few pages first." },
      { status: 400 },
    );
  }

  try {
    const shotList = await generateShotList(script, {
      genre,
      title,
      storyboard,
      lowBudget,
    });
    if (!shotList) {
      return NextResponse.json(
        { error: "Shot list generation returned no data. Try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ shotList });
  } catch (err: any) {
    console.error("Shot list generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Shot list generation failed" },
      { status: 500 },
    );
  }
}
