// C:\Users\vizir\VizirPro\app\api\generate\route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  generateScript,
  generateCharacters,
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
  // Validate scriptLength
  const validDurations = ["1 min", "5 min", "10 min", "15 min", "30 min", "60 min", "120 min"];
  if (!validDurations.includes(scriptLength)) {
    console.warn(`Invalid scriptLength: ${scriptLength}. Defaulting to 5 min.`);
    scriptLength = "5 min";
  }

  console.log("Generating script data with:", { movieIdea, movieGenre, scriptLength });

  const {
    logline,
    synopsis,
    scriptText,
    shortScript,
    themes,
  } = await generateScript(movieIdea, movieGenre, scriptLength);

  // Generate characters based on the script
  let characters: Character[] = [];
  try {
    const charactersResult = await generateCharacters(scriptText, movieGenre);
    characters = charactersResult.characters || [];
    console.log(`Generated ${characters.length} characters`);
  } catch (error) {
    console.error("Failed to generate characters:", error);
  }

  // Estimate page count and scene count for logging
  const estPages = Math.round(scriptText.split("\n").length / 40);
  const sceneCount = (scriptText.match(/^(INT\.|EXT\.)/gm) || []).length;
  console.log("Script stats:", { estPages, sceneCount, characterCount: characters.length });

  return {
    logline,
    synopsis,
    script: scriptText,
    scriptText,
    shortScript,
    themes,
    characters,
  };
}

export async function POST(request: NextRequest) {
  let body: any = {}; // Declare body outside try block
  try {
    body = await request.json();
    const {
      movieIdea,
      movieGenre,
      scriptLength,
      step,
      script,
      scriptContent,
      characters,
    } = body;

    console.log("Received request:", { movieIdea, movieGenre, scriptLength, step });

    if (
      !movieIdea &&
      !["storyboard", "schedule", "locations", "sound", "characters"].includes(step)
    ) {
      return NextResponse.json(
        { error: "Movie idea and genre are required for script generation." },
        { status: 400 }
      );
    }

    switch (step) {
      case "characters": {
        if (!scriptContent) {
          return NextResponse.json(
            { error: "scriptContent is required for generating characters." },
            { status: 400 }
          );
        }
        const charactersResult = await generateCharacters(scriptContent, movieGenre);
        return NextResponse.json(charactersResult);
      }

      case "concept": {
        if (!script) {
          return NextResponse.json(
            { error: "Script is required for generating concept." },
            { status: 400 }
          );
        }
        const result = await generateConcept(script, movieGenre || "");
        return NextResponse.json(result);
      }

      case "storyboard": {
        if (!movieIdea || !movieGenre || !scriptLength) {
          return NextResponse.json(
            {
              error: "movieIdea, movieGenre, and scriptLength are required for storyboard.",
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
        if (!movieGenre || !scriptLength) {
          return NextResponse.json(
            { error: "movieGenre and scriptLength are required for budget." },
            { status: 400 }
          );
        }
        const result = await generateBudget(movieGenre, scriptLength);
        return NextResponse.json(result);
      }

      case "schedule": {
        if (!script || !scriptLength) {
          return NextResponse.json(
            { error: "script and scriptLength are required for schedule." },
            { status: 400 }
          );
        }
        const result = await generateSchedule(script, scriptLength);
        return NextResponse.json(result);
      }

      case "locations": {
        if (!script) {
          return NextResponse.json(
            { error: "script is required for locations." },
            { status: 400 }
          );
        }
        const result = await generateLocations(script, movieGenre || "");
        return NextResponse.json(result);
      }

      case "sound": {
        if (!script) {
          return NextResponse.json(
            { error: "script is required for sound assets." },
            { status: 400 }
          );
        }
        const result = await generateSoundAssets(script, movieGenre || "");
        return NextResponse.json(result);
      }

      default: {
        if (!movieIdea || !movieGenre || !scriptLength) {
          return NextResponse.json(
            { error: "movieIdea, movieGenre, and scriptLength are required for script generation." },
            { status: 400 }
          );
        }

        const scriptResult = await generateScriptData(movieIdea, movieGenre, scriptLength);

        return NextResponse.json({
          idea: movieIdea,
          genre: movieGenre,
          length: scriptLength,
          logline: scriptResult.logline,
          synopsis: scriptResult.synopsis,
          script: scriptResult.scriptText,
          shortScript: scriptResult.shortScript,
          themes: scriptResult.themes,
          characters: scriptResult.characters,
        });
      }
    }
  } catch (error: any) {
    console.error("[API] Generation error:", error, { input: body || "No input available" });
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate film package. Please try again later.",
        details: error?.stack || "No stack trace available",
      },
      { status: 500 }
    );
  }
}