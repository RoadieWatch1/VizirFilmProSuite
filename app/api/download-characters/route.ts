import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import fetch from "node-fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characters } = body;

    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return NextResponse.json(
        { error: "No characters provided for download." },
        { status: 400 }
      );
    }

    // Create ZIP archive
    const zip = new JSZip();

    // Add characters JSON
    const characterData = {
      exportDate: new Date().toISOString(),
      totalCharacters: characters.length,
      characters: characters.map((c: any) => ({
        name: c.name,
        role: c.role,
        description: c.description,
        traits: c.traits || [],
        skinColor: c.skinColor,
        hairColor: c.hairColor,
        clothingColor: c.clothingColor,
        mood: c.mood,
        visualDescription: c.visualDescription,
      })),
    };

    zip.file("characters.json", JSON.stringify(characterData, null, 2));

    // Create an images subfolder
    const imagesFolder = zip.folder("character_images");

    // Download and add character images
    for (let i = 0; i < characters.length; i++) {
      const character = characters[i];
      if (character.imageUrl) {
        try {
          const response = await fetch(character.imageUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const safeFileName = character.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "_")
              .replace(/_+/g, "_");
            imagesFolder?.file(`${safeFileName}_portrait.png`, buffer);
            console.log(`✅ Downloaded image for ${character.name}`);
          }
        } catch (err) {
          console.warn(`⚠️ Failed to download image for ${character.name}:`, err);
        }
      }
    }

    // Generate and send ZIP
    const blob = await zip.generateAsync({ type: "arraybuffer" });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="characters_package.zip"',
      },
    });
  } catch (error: any) {
    console.error("❌ Character download error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate character download package.",
      },
      { status: 500 }
    );
  }
}
