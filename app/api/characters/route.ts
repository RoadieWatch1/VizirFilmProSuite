import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateCharacters } from "@/lib/generators"; // ← adjust this path if needed

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

      // Call your generator function
      const result = await generateCharacters(scriptContent, genre);

      // Expecting result like: { characters: [...] }
      return NextResponse.json(result);
    }

    if (step === "generate-portrait") {
      if (!character || !character.name || !character.description) {
        return NextResponse.json(
          { error: "Character name and description are required." },
          { status: 400 }
        );
      }

      // Build a consistent visual description
      const visualDescription = buildVisualDescription(character);

      // Compose a DALL·E prompt
      const imagePrompt = `Full-body concept art portrait. ${visualDescription}. Cinematic style, high detail, color.`;

      // Call DALL·E 3
      const dalleImage = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
      });

      // ✅ SAFE: guarantee a string
      const imageUrl = dalleImage.data?.[0]?.url || "";

      return NextResponse.json({
        imageUrl,
        visualDescription,
      });
    }

    return NextResponse.json(
      { error: "Invalid step or request." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[API] Character generation error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to generate character data. Please try again.",
      },
      { status: 500 }
    );
  }
}

function buildVisualDescription(character: any): string {
  const {
    name,
    description,
    role,
    mood,
    skinColor,
    hairColor,
    clothingColor,
  } = character;

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
