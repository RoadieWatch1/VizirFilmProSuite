import { NextRequest, NextResponse } from "next/server";
import {
  generateScript,
  generateCharacters, // FIXED: Added missing import for generateCharacters
  generateStoryboard,
  generateConcept,
  generateBudget,
  generateSchedule,
  generateLocations,
  generateSoundAssets,
  StoryboardFrame,
  Character,
} from "@/lib/generators";

export const dynamic = "force-dynamic";

async function generateScriptData(
  movieIdea: string,
  movieGenre: string,
  scriptLength: string
) {
  const {
    logline,
    synopsis,
    script,
    scriptText,
    shortScript,
    themes,
  } = await generateScript(movieIdea, movieGenre, scriptLength);

  return {
    logline,
    synopsis,
    script,
    scriptText,
    shortScript,
    themes,
    characters: [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      movieIdea,
      movieGenre,
      scriptLength,
      step,
      script,
      scriptContent,
      characters,
    } = body;

    if (
      !movieIdea &&
      !["storyboard", "schedule", "locations", "sound", "characters"].includes(
        step
      )
    ) {
      return NextResponse.json(
        { error: "Movie idea and genre are required." },
        { status: 400 }
      );
    }

    switch (step) {
      case "characters": {
        if (!scriptContent) {
          return NextResponse.json(
            {
              error: "scriptContent is required for generating characters.",
            },
            { status: 400 }
          );
        }
        const charactersResult = await generateCharacters(
          scriptContent,
          movieGenre
        );
        return NextResponse.json(charactersResult);
      }

      case "concept": {
        const result = await generateConcept(script || "", movieGenre || "");
        return NextResponse.json(result);
      }

      case "storyboard": {
        if (!movieIdea || !movieGenre || !scriptLength) {
          return NextResponse.json(
            {
              error:
                "movieIdea, movieGenre, and scriptLength are required for storyboard.",
            },
            { status: 400 }
          );
        }

        const frames: StoryboardFrame[] = await generateStoryboard({
          movieIdea,
          movieGenre,
          script: script || "",
          scriptLength,
          characters: characters || [],
        });

        return NextResponse.json({
          storyboard: frames.map((frame) => ({
            scene: frame.scene,
            shotNumber: frame.shotNumber,
            description: frame.description,
            cameraAngle: frame.cameraAngle || "",
            cameraMovement: frame.cameraMovement || "",
            lens: frame.lens || "",
            lighting: frame.lighting || "",
            duration: frame.duration || "",
            dialogue: frame.dialogue || "",
            soundEffects: frame.soundEffects || "",
            notes: frame.notes || "",
            imageUrl: frame.imageUrl || "",
            coverageShots: (frame.coverageShots || []).map((shot) => ({
              scene: shot.scene,
              shotNumber: shot.shotNumber,
              description: shot.description,
              cameraAngle: shot.cameraAngle || "",
              cameraMovement: shot.cameraMovement || "",
              lens: shot.lens || "",
              lighting: shot.lighting || "",
              duration: shot.duration || "",
              dialogue: shot.dialogue || "",
              soundEffects: shot.soundEffects || "",
              notes: shot.notes || "",
              imageUrl: shot.imageUrl || "",
            })),
          })),
        });
      }

      case "budget": {
        const result = await generateBudget(
          movieGenre || "",
          scriptLength || ""
        );
        return NextResponse.json(result);
      }

      case "schedule": {
        const result = await generateSchedule(
          script || "",
          scriptLength || ""
        );
        return NextResponse.json(result);
      }

      case "locations": {
        const result = await generateLocations(
          script || "",
          movieGenre || ""
        );
        return NextResponse.json(result);
      }

      case "sound": {
        const result = await generateSoundAssets(
          script || "",
          movieGenre || ""
        );
        return NextResponse.json(result);
      }

      default: {
        const scriptResult = await generateScriptData(
          movieIdea || "",
          movieGenre || "",
          scriptLength || ""
        );

        return NextResponse.json({
          idea: movieIdea,
          genre: movieGenre,
          length: scriptLength,
          logline: scriptResult.logline,
          synopsis: scriptResult.synopsis,
          script: scriptResult.scriptText || "",
          shortScript: scriptResult.shortScript || [],
          themes: scriptResult.themes || [],
          characters: scriptResult.characters || [],
        });
      }
    }
  } catch (error: any) {
    console.error("[API] Generation error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to generate film package. Please try again later.",
      },
      { status: 500 }
    );
  }
}