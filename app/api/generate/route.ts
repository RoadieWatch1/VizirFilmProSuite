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

/** Robust duration parser:
 *  "120", "120 min", "120m", "2h", "2 hours", "feature" (-> 100), "short" (-> 10)
 */
function parseDurationToMinutes(raw: string | undefined): number {
  if (!raw) return 5;
  const s = String(raw).trim().toLowerCase();

  // common aliases
  if (s.includes("feature")) return 100; // safer default; the generator will still target minutes=pages
  if (s.includes("short")) return 10;

  // explicit minutes like "120", "120m", "120 min", "90min"
  const minMatch = s.match(/(\d+)\s*(m|min|mins|minute|minutes)?\b/);
  // hours like "2h", "2 hour", "2 hours"
  const hrMatch = s.match(/(\d+)\s*(h|hr|hour|hours)\b/);

  if (hrMatch) {
    const h = parseInt(hrMatch[1], 10);
    if (!isNaN(h)) return Math.max(1, h * 60);
  }
  if (minMatch) {
    const m = parseInt(minMatch[1], 10);
    if (!isNaN(m)) return Math.max(1, m);
  }

  // fallbacks for common labels
  if (s.includes("1")) return 1;
  if (s.includes("5")) return 5;
  if (s.includes("10")) return 10;
  if (s.includes("15")) return 15;
  if (s.includes("30")) return 30;
  if (s.includes("60")) return 60;
  if (s.includes("120")) return 120;

  return 5;
}

function estimatePagesByWords(text: string, wordsPerPage = 220): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerPage));
}

function countScenes(text: string): number {
  // Fountain-ish scene headings
  return (text.match(/^(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/gmi) || []).length;
}

async function generateScriptData(
  movieIdea: string,
  movieGenre: string,
  scriptLength: string
) {
  // Parse and normalize the duration instead of forcing a fixed whitelist
  const minutes = parseDurationToMinutes(scriptLength);
  const normalizedLength = `${minutes} min`;

  console.log("Generating script data with:", {
    movieIdea,
    movieGenre,
    requestedLength: scriptLength,
    normalizedLength,
  });

  const {
    logline,
    synopsis,
    scriptText,
    shortScript,
    themes,
  } = await generateScript(movieIdea, movieGenre, normalizedLength);

  // Characters from generated script (best results after script exists)
  let characters: Character[] = [];
  try {
    const charactersResult = await generateCharacters(scriptText, movieGenre);
    characters = charactersResult.characters || [];
    console.log(`Generated ${characters.length} characters`);
  } catch (error) {
    console.error("Failed to generate characters:", error);
  }

  // Improved stats
  const estPages = estimatePagesByWords(scriptText, 220); // ~1 page/min
  const sceneCount = countScenes(scriptText);
  console.log("Script stats:", {
    estPages,
    targetMinutes: minutes,
    sceneCount,
    characterCount: characters.length,
  });

  return {
    logline,
    synopsis,
    scriptText,
    shortScript,
    themes,
    characters,
    stats: {
      estimatedPages: estPages,
      targetMinutes: minutes,
      sceneCount,
      characterCount: characters.length,
    },
  };
}

export async function POST(request: NextRequest) {
  let body: any = {};
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

    console.log("Received request:", {
      movieIdea: !!movieIdea,
      movieGenre,
      scriptLength,
      step,
      hasScript: !!script,
      hasScriptContent: !!scriptContent,
      charactersCount: Array.isArray(characters) ? characters.length : 0,
    });

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
          length: `${parseDurationToMinutes(scriptLength)} min`,
          logline: scriptResult.logline,
          synopsis: scriptResult.synopsis,
          script: scriptResult.scriptText, // legacy key
          scriptText: scriptResult.scriptText,
          shortScript: scriptResult.shortScript,
          themes: scriptResult.themes,
          characters: scriptResult.characters,
          stats: scriptResult.stats, // <-- expose stats to UI
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
