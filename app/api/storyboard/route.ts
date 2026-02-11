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

// Strip scene-specific content, keep only the storyboard art direction
function buildFallbackPrompt(originalPrompt: string): string {
  // Extract shot type and angle from the original prompt if possible
  const shotMatch = originalPrompt.match(/(wide|medium|close-up|establishing|over-shoulder|insert|extreme)\s*(shot|long shot|close-up)?/i);
  const shotDesc = shotMatch ? shotMatch[0] : "medium shot";

  return (
    "Cinematic hand-drawn storyboard sketch, black and white pencil style, " +
    "professional film pre-production, dramatic lighting, realistic proportions, " +
    `strong composition, ${shotDesc}, moody atmosphere, ` +
    "detailed line work, visible pencil strokes, cross-hatching effect, " +
    "not photorealistic, no color, no text, no UI elements, " +
    "film production storyboard panel with figures in a dramatic scene."
  );
}

function isContentPolicyError(err: any): boolean {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("content_policy") || msg.includes("safety");
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
      const BW_SUFFIX = "detailed line work, moody atmosphere, visible pencil strokes, charcoal sketch texture, not photorealistic, no color, no text, no UI elements.";

      // Don't double-wrap prompts already from generateCompliantImagePrompt
      let safePrompt: string;
      if (imagePrompt.startsWith("Cinematic hand-drawn")) {
        safePrompt = imagePrompt;
      } else {
        safePrompt = `${BW_PREFIX} ${imagePrompt}, ${BW_SUFFIX}`;
      }

      // Truncate — shorter prompts work better with DALL-E 3
      const finalPrompt = safePrompt.length > 950
        ? safePrompt.slice(0, 950)
        : safePrompt;

      // Attempt 1: Full prompt
      try {
        const result = await openai.images.generate({
          model: "dall-e-3",
          prompt: finalPrompt,
          n: 1,
          size: "1792x1024",
          quality: "standard",
          style: "natural",
        });

        const imageUrl = result.data?.[0]?.url || "";
        return NextResponse.json({ imageUrl, shotNumber: shotNumber || "" });
      } catch (err: any) {
        if (!isContentPolicyError(err)) throw err;
        console.warn("[Storyboard] Content policy on attempt 1, retrying with fallback prompt...");
      }

      // Attempt 2: Fallback — strip scene content, keep only art direction
      try {
        const fallback = buildFallbackPrompt(finalPrompt);
        const result = await openai.images.generate({
          model: "dall-e-3",
          prompt: fallback,
          n: 1,
          size: "1792x1024",
          quality: "standard",
          style: "natural",
        });

        const imageUrl = result.data?.[0]?.url || "";
        return NextResponse.json({ imageUrl, shotNumber: shotNumber || "" });
      } catch (err: any) {
        if (isContentPolicyError(err)) {
          return NextResponse.json(
            { error: "Image was blocked by content policy after retry. Try regenerating this frame." },
            { status: 400 }
          );
        }
        throw err;
      }
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
