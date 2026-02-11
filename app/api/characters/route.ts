// C:\Users\vizir\VizirPro\app\api\characters\route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateCharacters } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Build-safe lazy init (prevents Vercel build crash when env vars aren't present)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, character, scriptContent, genre } = body;

    if (step === "generate-characters") {
      if (!scriptContent || !genre) {
        return NextResponse.json(
          { error: "Missing script content or genre." },
          { status: 400 }
        );
      }

      const result = await generateCharacters(scriptContent, genre);
      console.log("API returning characters:", result.characters);
      return NextResponse.json(result);
    }

    if (step === "generate-portrait") {
      if (!character || !character.name || !character.description) {
        return NextResponse.json(
          { error: "Character name and description are required." },
          { status: 400 }
        );
      }

      const visualDescription = buildVisualDescription(character);
      const imagePrompt = `Cinematic character portrait for film production. ${visualDescription}. Professional movie production style, high detail, natural colors, dramatic cinematic lighting. Full head and upper body visible, costume and styling visible. Looks like a professional film character study sheet.`.slice(0, 950);

      try {
        const openai = getOpenAI();
        const dalleImage = await openai.images.generate({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1792",
          style: "natural",
        });

        const imageUrl = dalleImage.data?.[0]?.url || "";
        console.log("Generated portrait URL:", imageUrl);

        return NextResponse.json({
          imageUrl,
          visualDescription,
        });
      } catch (err: any) {
        console.error("DALL-E error:", err);
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("content_policy") || msg.includes("safety")) {
          return NextResponse.json(
            { error: "Portrait was blocked by content policy. Try adjusting character description." },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: err?.message || "Failed to generate portrait." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid step or request." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[API] Character generation error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate character data. Please try again.",
      },
      { status: 500 }
    );
  }
}

function buildVisualDescription(character: any): string {
  const { name, description, role, mood, skinColor, hairColor, clothingColor } = character;

  return [
    `Character name: ${name}`,
    `Description: ${description}`,
    role ? `Role: ${role}` : "",
    mood ? `Mood: ${mood}` : "",
    skinColor ? `Skin color: ${skinColor}` : "",
    hairColor ? `Hair color: ${hairColor}` : "",
    clothingColor ? `Clothing color: ${clothingColor}` : "",
  ]
    .filter(Boolean)
    .join(". ");
}