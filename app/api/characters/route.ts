import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateCharacters } from "@/lib/generators"; // ← adjust this path if needed

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";

async function generatePortrait(character: any) {
  const visualDescription = buildVisualDescription(character);

  const imagePrompt = `Full-body character concept art. ${visualDescription}. Cinematic style, high detail, vibrant colors. Ensure full head and body are in frame, no cropping.`;

  const dalleImage = await openai.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1792",
  });

  const imageUrl = dalleImage.data?.[0]?.url || "";

  return { imageUrl, visualDescription };
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

      // Call your generator function
      const result = await generateCharacters(scriptContent, genre);

      let characters = result.characters || [];

      // Generate portraits for each character
      for (let i = 0; i < characters.length; i++) {
        try {
          const { imageUrl, visualDescription } = await generatePortrait(characters[i]);
          characters[i].imageUrl = imageUrl;
          characters[i].visualDescription = visualDescription;
        } catch (err) {
          console.error("Failed to generate portrait for character:", characters[i]?.name, err);
          characters[i].imageUrl = "";
          characters[i].visualDescription = "";
        }
      }

      return NextResponse.json({ characters });
    }

    if (step === "generate-portrait") {
      if (!character || !character.name || !character.description) {
        return NextResponse.json(
          { error: "Character name and description are required." },
          { status: 400 }
        );
      }

      const { imageUrl, visualDescription } = await generatePortrait(character);

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