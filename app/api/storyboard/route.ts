import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, imagePrompt, shotNumber } = body;

    if (step === "generate-frame-image") {
      if (!imagePrompt) {
        return NextResponse.json(
          { error: "imagePrompt is required." },
          { status: 400 }
        );
      }

      const openai = getOpenAI();

      // Enforce B&W pencil sketch style in the prompt
      const BW_PREFIX = "Black and white pencil sketch storyboard panel, hand-drawn style, clean line art on white paper.";
      const BW_SUFFIX = "No color. Graphite pencil only. Professional storyboard art style with hatching for shadows. 16:9 widescreen aspect ratio composition.";
      const safePrompt = imagePrompt.startsWith("Black and white")
        ? `${imagePrompt} ${BW_SUFFIX}`
        : `${BW_PREFIX} ${imagePrompt} ${BW_SUFFIX}`;

      // Truncate to DALL-E 3 prompt limit (~4000 chars)
      const finalPrompt = safePrompt.length > 3900
        ? safePrompt.slice(0, 3900) + "..."
        : safePrompt;

      const result = await openai.images.generate({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: "1792x1024", // Landscape for storyboard panels
        quality: "standard",
        style: "natural",
      });

      const imageUrl = result.data?.[0]?.url || "";

      return NextResponse.json({
        imageUrl,
        shotNumber: shotNumber || "",
      });
    }

    return NextResponse.json(
      { error: "Invalid step. Use 'generate-frame-image'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[API] Storyboard image generation error:", error);

    const msg = String(error?.message || "").toLowerCase();

    if (msg.includes("content_policy") || msg.includes("safety")) {
      return NextResponse.json(
        { error: "Image was blocked by content policy. Try regenerating this frame." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Failed to generate storyboard image." },
      { status: 500 }
    );
  }
}
