// C:\Users\vizir\VizirPro\app\api\table-read\prepare\route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildTableReadPackage } from "@/lib/tableRead";
import type { Character } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MIN_SCRIPT_CHARS = 100;
const DEFAULT_PREVIEW_PAGES = 10;

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const script = String(body?.script || "").trim();
  if (!script || script.length < MIN_SCRIPT_CHARS) {
    return NextResponse.json(
      { error: "Provide a screenplay of at least 100 characters before preparing a table read." },
      { status: 400 },
    );
  }

  const characters: Character[] = Array.isArray(body?.characters)
    ? body.characters.filter((c: any) => c && typeof c?.name === "string")
    : [];

  const preview = body?.preview !== false; // default to preview mode (safer on cost)
  const previewPages = Number.isFinite(body?.previewPages)
    ? Math.max(1, Math.min(120, Number(body.previewPages)))
    : DEFAULT_PREVIEW_PAGES;

  const manualOverrides =
    body?.voiceOverrides && typeof body.voiceOverrides === "object"
      ? (body.voiceOverrides as Record<string, string>)
      : {};

  try {
    const pkg = buildTableReadPackage(script, characters, {
      previewPages: preview ? previewPages : undefined,
      manualOverrides,
    });
    return NextResponse.json(pkg);
  } catch (err: any) {
    console.error("Table read prepare failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to prepare table read." },
      { status: 500 },
    );
  }
}
