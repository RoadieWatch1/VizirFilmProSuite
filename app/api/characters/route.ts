// C:\Users\vizir\VizirPro\app\api\characters\route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateCharacters } from "@/lib/generators";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";

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
      const imagePrompt = `Photorealistic full-body portrait of a real person portraying the character. ${visualDescription}. Cinematic style, high detail, natural colors, realistic textures and lighting. Ensure full head and body are in frame, no cropping. The image should look like a professional actor in costume, ready for film production.`;

      try {
        const dalleImage = await openai.images.generate({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1792",
        });

        const imageUrl = dalleImage.data?.[0]?.url || "";
        console.log("Generated portrait URL:", imageUrl);

        return NextResponse.json({
          imageUrl,
          visualDescription,
        });
      } catch (err) {
        console.error("DALL-E error:", err);
        return NextResponse.json(
          { error: "Failed to generate portrait." },
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