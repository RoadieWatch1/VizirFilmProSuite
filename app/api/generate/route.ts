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
export const runtime = "nodejs";

// ✅ Helps avoid timeouts for long/feature generation on serverless
export const maxDuration = 800;

const ALLOWED_STEPS = new Set([
  "characters",
  "concept",
  "storyboard",
  "budget",
  "schedule",
  "locations",
  "sound",
]);

function jsonError(message: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ error: message, ...(extra || {}) }, { status });
}

/** Parse flexible duration strings:
 *  "120", "120 min", "120m", "2h", "2 hours",
 *  "60 min (Full Feature)", "120 min (Full Feature)",
 *  keyword-only fallback: "feature" (-> 120), "short" (-> 10)
 */
function parseDurationToMinutes(raw: string | undefined): number {
  if (!raw) return 5;
  const s = String(raw).trim().toLowerCase();

  // Prefer explicit hour formats first: "2h", "2 hours"
  const hrMatch = s.match(/(\d+)\s*(h|hr|hour|hours)\b/);
  if (hrMatch) {
    const h = parseInt(hrMatch[1], 10);
    if (!isNaN(h)) return clampMinutes(h * 60);
  }

  // Prefer explicit numbers next (covers: "120 min (Full Feature)" => 120)
  const numMatch = s.match(/(\d{1,3})/);
  if (numMatch) {
    const m = parseInt(numMatch[1], 10);
    if (!isNaN(m)) return clampMinutes(m);
  }

  // Keyword-only fallbacks (ONLY if there was no number at all)
  if (s.includes("feature")) return 120;
  if (s.includes("short")) return 10;

  return 5;
}

function clampMinutes(mins: number): number {
  if (!Number.isFinite(mins)) return 5;
  return Math.max(1, Math.min(240, Math.round(mins)));
}

function estimatePagesByWords(text: string, wordsPerPage = 220): number {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerPage));
}

function countScenes(text: string): number {
  return (String(text || "").match(/^(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/gim) || []).length;
}

function normalizeOpenAIError(error: any): { status: number; message: string; hint?: string } {
  const msg = String(error?.message || "");
  const code = String(error?.code || error?.error?.code || "");
  const statusRaw = Number(error?.status || error?.response?.status || 500);
  const status = statusRaw >= 400 && statusRaw <= 599 ? statusRaw : 500;

  // ✅ Auth / API key
  if (
    status === 401 ||
    code === "invalid_api_key" ||
    msg.toLowerCase().includes("invalid api key") ||
    msg.toLowerCase().includes("incorrect api key")
  ) {
    return {
      status: 401,
      message: msg || "Invalid OpenAI API key.",
      hint:
        "Fix: confirm OPENAI_API_KEY is set in Vercel (Production + Preview) and redeploy. Make sure you pasted the full key and it belongs to the right OpenAI project.",
    };
  }

  // ✅ Model access / not found
  if (
    code === "model_not_found" ||
    msg.includes("does not have access to model") ||
    msg.includes("model_not_found")
  ) {
    return {
      status: 400,
      message: msg || "Your OpenAI project does not have access to the requested model.",
      hint:
        "Fix: set Vercel env vars OPENAI_MODEL_TEXT and OPENAI_MODEL_JSON to a model your project can access (you set gpt-5.2 — if access fails, switch to an allowed model for your project).",
    };
  }

  // ✅ Wrong token param
  if (msg.includes("Unsupported parameter") && msg.includes("max_tokens")) {
    return {
      status: 400,
      message: msg,
      hint:
        "Fix: remove max_tokens from API calls and use max_completion_tokens instead. Search your repo for `max_tokens:` and replace.",
    };
  }

  // ✅ Rate limit
  if (status === 429 || code === "rate_limit_exceeded" || msg.toLowerCase().includes("rate limit")) {
    return {
      status: 429,
      message: msg || "Rate limit exceeded.",
      hint:
        "Fix: reduce concurrency (SCRIPT_CHUNK_CONCURRENCY), reduce script length, or add backoff/retry client-side. Also verify your OpenAI account limits.",
    };
  }

  // ✅ Timeouts
  if (
    msg.toLowerCase().includes("timeout") ||
    msg.toLowerCase().includes("timed out") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("AbortError")
  ) {
    return {
      status: 504,
      message: msg || "Request timed out.",
      hint:
        "Fix: reduce script length, lower SCRIPT_CHUNK_CONCURRENCY, or shorten outline budgets (OUTLINE_TOTAL_BUDGET_MS / OUTLINE_CALL_TIMEOUT_MS).",
    };
  }

  // Fall back
  return {
    status,
    message: msg || "Unknown error",
  };
}

async function generateScriptData(movieIdea: string, movieGenre: string, scriptLength: string) {
  const minutes = parseDurationToMinutes(scriptLength);
  const normalizedLength = `${minutes} min`;

  console.log("Generating script data with:", {
    movieIdea: !!movieIdea,
    movieGenre,
    requestedLength: scriptLength,
    parsedMinutes: minutes,
    normalizedLength,
  });

  const { logline, synopsis, scriptText, shortScript, themes } = await generateScript(
    movieIdea,
    movieGenre,
    normalizedLength
  );

  if (!scriptText || !String(scriptText).trim()) {
    throw new Error("Script generator returned empty scriptText.");
  }

  // Characters (better after script exists)
  let characters: Character[] = [];
  try {
    const charactersResult = await generateCharacters(scriptText, movieGenre);
    characters = charactersResult.characters || [];
    console.log(`Generated ${characters.length} characters`);
  } catch (err) {
    console.error("Failed to generate characters:", err);
  }

  // Stats
  const estPages = estimatePagesByWords(scriptText, 220);
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
  const startedAt = Date.now();
  let body: any = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const {
      movieIdea,
      movieGenre,
      scriptLength,
      step: rawStep,
      script,
      scriptContent,
      characters,
    } = body || {};

    const step = String(rawStep || "").trim().toLowerCase();
    const isStepMode = !!step;

    console.log("Received request:", {
      step,
      isStepMode,
      movieIdea: !!movieIdea,
      movieGenre,
      scriptLength,
      parsedMinutes: scriptLength ? parseDurationToMinutes(scriptLength) : null,
      hasScript: !!script,
      hasScriptContent: !!scriptContent,
      charactersCount: Array.isArray(characters) ? characters.length : 0,
    });

    if (isStepMode && !ALLOWED_STEPS.has(step)) {
      return jsonError(
        `Invalid step "${step}". Allowed: ${Array.from(ALLOWED_STEPS).join(", ")}`,
        400
      );
    }

    // If NOT step mode, we’re generating the full package (script + meta)
    if (!isStepMode) {
      if (!movieIdea || !movieGenre || !scriptLength) {
        return jsonError("movieIdea, movieGenre, and scriptLength are required for script generation.", 400);
      }

      const scriptResult = await generateScriptData(String(movieIdea), String(movieGenre), String(scriptLength));
      const minutes = parseDurationToMinutes(String(scriptLength));

      return NextResponse.json({
        idea: movieIdea,
        genre: movieGenre,
        length: `${minutes} min`,
        logline: scriptResult.logline,
        synopsis: scriptResult.synopsis,
        script: scriptResult.scriptText, // legacy key
        scriptText: scriptResult.scriptText,
        shortScript: scriptResult.shortScript,
        themes: scriptResult.themes,
        characters: scriptResult.characters,
        stats: scriptResult.stats,
        meta: {
          step: "script",
          ms: Date.now() - startedAt,
        },
      });
    }

    // Step mode handlers
    switch (step) {
      case "characters": {
        const content = scriptContent || script;
        if (!content) {
          return jsonError("scriptContent (or script) is required for generating characters.", 400);
        }
        const result = await generateCharacters(String(content), String(movieGenre || ""));
        return NextResponse.json({
          ...result,
          meta: { step, ms: Date.now() - startedAt },
        });
      }

      case "concept": {
        const content = scriptContent || script;
        if (!content) {
          return jsonError("script (or scriptContent) is required for generating concept.", 400);
        }
        const result = await generateConcept(String(content), String(movieGenre || ""));
        return NextResponse.json({
          ...result,
          meta: { step, ms: Date.now() - startedAt },
        });
      }

      case "storyboard": {
        if (!movieIdea || !movieGenre || !scriptLength) {
          return jsonError("movieIdea, movieGenre, and scriptLength are required for storyboard.", 400);
        }

        const content = scriptContent || script;
        if (!content) {
          return jsonError("script (or scriptContent) is required for storyboard generation.", 400);
        }

        const frames: StoryboardFrame[] = await generateStoryboard({
          movieIdea: String(movieIdea),
          movieGenre: String(movieGenre),
          script: String(content),
          scriptLength: String(scriptLength),
          characters: (Array.isArray(characters) ? (characters as Character[]) : []) || [],
        });

        return NextResponse.json({
          storyboard: (frames || []).map((frame) => ({
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
          meta: { step, ms: Date.now() - startedAt },
        });
      }

      case "budget": {
        if (!movieGenre || !scriptLength) {
          return jsonError("movieGenre and scriptLength are required for budget.", 400);
        }
        const result = await generateBudget(String(movieGenre), String(scriptLength));
        return NextResponse.json({
          ...result,
          meta: { step, ms: Date.now() - startedAt },
        });
      }

      case "schedule": {
        const content = scriptContent || script;
        if (!content || !scriptLength) {
          return jsonError("script (or scriptContent) and scriptLength are required for schedule.", 400);
        }
        const result = await generateSchedule(String(content), String(scriptLength));
        return NextResponse.json({
          ...result,
          meta: { step, ms: Date.now() - startedAt },
        });
      }

      case "locations": {
        const content = scriptContent || script;
        if (!content) {
          return jsonError("script (or scriptContent) is required for locations.", 400);
        }
        const result = await generateLocations(String(content), String(movieGenre || ""));
        return NextResponse.json({
          ...result,
          meta: { step, ms: Date.now() - startedAt },
        });
      }

      case "sound": {
        const content = scriptContent || script;
        if (!content) {
          return jsonError("script (or scriptContent) is required for sound assets.", 400);
        }
        const result = await generateSoundAssets(String(content), String(movieGenre || ""));
        return NextResponse.json({
          ...result,
          meta: { step, ms: Date.now() - startedAt },
        });
      }

      default: {
        return jsonError("Unhandled step.", 400);
      }
    }
  } catch (error: any) {
    const normalized = normalizeOpenAIError(error);

    console.error("[API] Generation error:", error, { input: body || "No input available" });

    return NextResponse.json(
      {
        error: normalized.message || "Failed to generate film package. Please try again later.",
        hint: normalized.hint,
        details: error?.stack || "No stack trace available",
        meta: {
          ms: Date.now() - startedAt,
        },
      },
      { status: normalized.status || 500 }
    );
  }
}
