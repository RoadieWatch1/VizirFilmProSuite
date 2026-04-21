// C:\Users\vizir\VizirPro\app\api\vision-board\route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateVisionBoardPrompts } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (_openai) return _openai;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }
  _openai = new OpenAI({ apiKey });
  return _openai;
}

// DALL-E prompts have a ~4000 char limit but we keep shorter to stay safe.
const MAX_IMAGE_PROMPT = 950;

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const step = String(body?.step || "").trim();

  // ─────────────────────────────────────────────────────────
  // STEP: generate-prompts — build the 10-panel vision board.
  // ─────────────────────────────────────────────────────────
  if (step === "generate-prompts") {
    const title = String(body?.title || "").trim();
    const logline = String(body?.logline || "").trim();
    const synopsis = String(body?.synopsis || "").trim();
    const genre = String(body?.genre || "").trim() || "drama";
    const concept = String(body?.concept || "").trim();
    const script = String(body?.script || "").trim();
    const themes = Array.isArray(body?.themes)
      ? body.themes.filter((t: any) => typeof t === "string")
      : [];

    if (!logline && !synopsis && !concept && !script) {
      return NextResponse.json(
        {
          error:
            "Provide a logline, synopsis, concept note, or script before generating a vision board.",
        },
        { status: 400 },
      );
    }

    try {
      const board = await generateVisionBoardPrompts({
        title,
        logline,
        synopsis,
        genre,
        themes,
        concept,
        script,
      });
      if (!board) {
        return NextResponse.json(
          { error: "Vision board generation returned no data." },
          { status: 502 },
        );
      }
      return NextResponse.json({ visionBoard: board });
    } catch (err: any) {
      console.error("Vision board prompt generation failed:", err);
      return NextResponse.json(
        { error: err?.message || "Failed to generate vision board prompts." },
        { status: 500 },
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // STEP: generate-image — DALL-E 3 render of one panel.
  // ─────────────────────────────────────────────────────────
  if (step === "generate-image") {
    const imagePrompt = String(body?.imagePrompt || "").trim();
    if (!imagePrompt) {
      return NextResponse.json(
        { error: "imagePrompt is required." },
        { status: 400 },
      );
    }

    const safePrompt = imagePrompt.slice(0, MAX_IMAGE_PROMPT);

    try {
      const openai = getOpenAI();
      const result = await openai.images.generate({
        model: "dall-e-3",
        prompt: safePrompt,
        n: 1,
        size: "1792x1024", // cinematic 16:9
        style: "natural",
      });
      const imageUrl = result.data?.[0]?.url || "";
      if (!imageUrl) {
        return NextResponse.json(
          { error: "DALL-E returned no image URL." },
          { status: 502 },
        );
      }
      return NextResponse.json({ imageUrl });
    } catch (err: any) {
      console.error("Vision board image generation failed:", err);
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("content_policy") || msg.includes("safety")) {
        return NextResponse.json(
          {
            error:
              "Image was blocked by content policy. Regenerate the panel prompt or edit it to be safer.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: err?.message || "Failed to generate vision board image." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Invalid step." }, { status: 400 });
}
