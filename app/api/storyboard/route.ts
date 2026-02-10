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

      // Enforce cinematic hand-drawn storyboard style
      const BW_PREFIX = "Cinematic hand-drawn storyboard sketch, black and white pencil style, professional film storyboard, dramatic lighting, realistic proportions, strong composition,";
      const BW_SUFFIX = "Detailed line work, moody atmosphere, film pre-production storyboard, visible pencil strokes and cross-hatching for shadows, charcoal and ink sketch texture, not photorealistic, no color, no text, no captions, no UI elements.";
      const safePrompt = imagePrompt.startsWith("Cinematic hand-drawn")
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
