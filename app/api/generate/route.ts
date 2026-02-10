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

// ✅ Works only if Vercel Project Settings → Functions → Default Max Duration is set to 800
export const maxDuration = 800;

// ✅ Optional: keep LLM payload sizes sane for step-mode analysis calls
const STEP_SCRIPT_TRIM_CHARS = parseInt(process.env.STEP_SCRIPT_TRIM_CHARS || "24000", 10);

// ✅ Page/words calibration (sync with lib/generators.ts)
const SCRIPT_WORDS_PER_PAGE = Math.max(160, Math.min(320, parseInt(process.env.SCRIPT_WORDS_PER_PAGE || "220", 10)));

// ✅ Allow step-mode for script-only generation too (useful for debugging)
const ALLOWED_STEPS = new Set([
  "script",
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

function makeRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function truncateText(input: any, maxChars: number) {
  const s = String(input ?? "");
  if (!s) return "";
  if (!Number.isFinite(maxChars) || maxChars <= 0) return s;
  return s.length > maxChars ? s.slice(0, maxChars) : s;
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

function countWords(text: string): number {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function estimatePagesByWords(text: string, wordsPerPage = SCRIPT_WORDS_PER_PAGE): number {
  const words = countWords(text);
  return Math.max(1, Math.round(words / wordsPerPage));
}

function countScenes(text: string): number {
  return (String(text || "").match(/^(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/gim) || []).length;
}

// ✅ Robust OpenAI error extraction (OpenAI SDK often nests details under error.error.*)
function getErrMessage(error: any): string {
  return String(
    error?.message ||
      error?.error?.message ||
      error?.response?.data?.error?.message ||
      error?.cause?.message ||
      ""
  );
}
function getErrCode(error: any): string {
  return String(
    error?.code ||
      error?.error?.code ||
      error?.error?.type ||
      error?.response?.data?.error?.code ||
      ""
  );
}
function getErrStatus(error: any): number {
  const raw =
    error?.status ??
    error?.response?.status ??
    error?.response?.data?.status ??
    error?.error?.status ??
    0;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function normalizeOpenAIError(error: any): { status: number; message: string; hint?: string } {
  const msg = getErrMessage(error);
  const lower = msg.toLowerCase();
  const code = getErrCode(error);
  const statusRaw = getErrStatus(error);
  const status = statusRaw >= 400 && statusRaw <= 599 ? statusRaw : 500;

  // ✅ Missing env var (build-safe init throws this)
  if (lower.includes("missing openai_api_key") || lower.includes("missing openai api key")) {
    return {
      status: 500,
      message: msg || "Missing OPENAI_API_KEY.",
      hint:
        "Fix: Set OPENAI_API_KEY in Vercel → Project Settings → Environment Variables (Production + Preview), then redeploy.",
    };
  }

  // ✅ Auth / API key
  if (
    status === 401 ||
    code === "invalid_api_key" ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key")
  ) {
    return {
      status: 401,
      message: msg || "Invalid OpenAI API key.",
      hint:
        "Fix: confirm OPENAI_API_KEY is set in Vercel (Production + Preview) and redeploy. Make sure the key belongs to the correct OpenAI project.",
    };
  }

  // ✅ Model access / not found
  if (
    status === 403 ||
    status === 404 ||
    code === "model_not_found" ||
    lower.includes("does not have access to model") ||
    lower.includes("model_not_found") ||
    lower.includes("no such model") ||
    lower.includes("not found")
  ) {
    const hint =
      "Fix: Set Vercel env vars OPENAI_MODEL_TEXT and OPENAI_MODEL_JSON to a model your OpenAI *project* can access. " +
      "If you used a dated model like `gpt-4o-mini-2024-07-18` and got blocked, switch to `gpt-4o-mini` (or another model shown as allowed in your OpenAI Project settings), then redeploy. " +
      "You can also set OPENAI_FALLBACK_MODEL_TEXT / OPENAI_FALLBACK_MODEL_JSON to `gpt-4o-mini`.";

    return {
      status: status === 403 ? 403 : 400,
      message: msg || "Your OpenAI project does not have access to the requested model.",
      hint,
    };
  }

  // ✅ Model param restrictions (temperature not supported)
  if (lower.includes("unsupported value") && lower.includes("temperature")) {
    return {
      status: 400,
      message: msg,
      hint:
        "Fix: your selected model does NOT support temperature overrides. Keep OPENAI_SEND_TEMPERATURE unset (or 0). If set, set OPENAI_SEND_TEMPERATURE=0 and redeploy.",
    };
  }

  // ✅ Wrong token param
  if (lower.includes("unsupported parameter") && lower.includes("max_tokens")) {
    return {
      status: 400,
      message: msg,
      hint:
        "Fix: remove max_tokens from API calls and use max_completion_tokens instead. Search your repo for `max_tokens:` and replace.",
    };
  }

  // ✅ Quota / billing
  if (status === 402 || code === "insufficient_quota" || lower.includes("insufficient quota")) {
    return {
      status: 402,
      message: msg || "Insufficient quota.",
      hint:
        "Fix: check your OpenAI billing / usage limits for this project, and ensure the API key belongs to the project with quota.",
    };
  }

  // ✅ Rate limit
  if (status === 429 || code === "rate_limit_exceeded" || lower.includes("rate limit")) {
    return {
      status: 429,
      message: msg || "Rate limit exceeded.",
      hint:
        "Fix: reduce concurrency (SCRIPT_CHUNK_CONCURRENCY), reduce script length, or add backoff/retry client-side. Also verify your OpenAI account limits.",
    };
  }

  // ✅ Timeouts
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
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

/**
 * ✅ Simple hard timeout wrapper (keeps API from hanging forever on a single step)
 */
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

function minPagesTargetForMinutes(minutes: number): number {
  // Tighter enforcement: scripts should be at least ~88-90% of target pages
  if (minutes >= 110) return Math.max(100, Math.round(minutes * 0.88));
  if (minutes >= 90) return Math.max(82, Math.round(minutes * 0.9));
  if (minutes >= 60) return Math.max(52, Math.round(minutes * 0.88));
  if (minutes >= 30) return Math.max(25, Math.round(minutes * 0.9));
  return Math.max(5, Math.round(minutes * 0.85));
}

async function generateScriptData(movieIdea: string, movieGenre: string, scriptLength: string, requestId: string) {
  const minutes = parseDurationToMinutes(scriptLength);
  const normalizedLength = `${minutes} min`;

  console.log(`[${requestId}] Generating script data with:`, {
    movieIdea: !!movieIdea,
    movieGenre,
    requestedLength: scriptLength,
    parsedMinutes: minutes,
    normalizedLength,

    // ✅ Safe env echo (helps catch “wrong project/env vars not deployed”)
    modelText: process.env.OPENAI_MODEL_TEXT || "(unset)",
    modelJson: process.env.OPENAI_MODEL_JSON || "(unset)",
    fallbackText: process.env.OPENAI_FALLBACK_MODEL_TEXT || "(unset)",
    fallbackJson: process.env.OPENAI_FALLBACK_MODEL_JSON || "(unset)",

    // ✅ Feature length controls (these MUST show up in prod logs if deployed)
    FEATURE_DEBUG_CHUNKS: process.env.FEATURE_DEBUG_CHUNKS || "(unset)",
    FEATURE_CONTINUE_PASSES: process.env.FEATURE_CONTINUE_PASSES || "(unset)",
    FEATURE_MIN_WORD_RATIO: process.env.FEATURE_MIN_WORD_RATIO || "(unset)",
    FEATURE_CONTINUE_TAIL_CHARS: process.env.FEATURE_CONTINUE_TAIL_CHARS || "(unset)",
    SCRIPT_CHUNK_CONCURRENCY: process.env.SCRIPT_CHUNK_CONCURRENCY || "(unset)",
    OPENAI_MAX_COMPLETION_TOKENS_CAP: process.env.OPENAI_MAX_COMPLETION_TOKENS_CAP || "(unset)",
    SCRIPT_WORDS_PER_PAGE: SCRIPT_WORDS_PER_PAGE,

    vercelMaxDuration: String(maxDuration),
    stepScriptTrimChars: STEP_SCRIPT_TRIM_CHARS,
  });

  // ✅ Script generation can take a while. Keep a route-side guard too.
  const { logline, synopsis, scriptText, shortScript, themes } = await withTimeout(
    generateScript(movieIdea, movieGenre, normalizedLength),
    760_000, // ~12m 40s (route max is 800s; keep buffer for JSON + response)
    "generateScript"
  );

  if (!scriptText || !String(scriptText).trim()) {
    throw new Error("Script generator returned empty scriptText.");
  }

  // Characters (better after script exists) — trim for safety
  let characters: Character[] = [];
  try {
    const trimmedForChars = truncateText(scriptText, STEP_SCRIPT_TRIM_CHARS);
    const charactersResult = await withTimeout(
      generateCharacters(trimmedForChars, movieGenre),
      120_000,
      "generateCharacters"
    );
    characters = charactersResult.characters || [];
    console.log(`[${requestId}] Generated ${characters.length} characters`);
  } catch (err) {
    console.error(`[${requestId}] Failed to generate characters:`, err);
  }

  // Stats + length check (now uses calibrated words-per-page)
  const words = countWords(scriptText);
  const estPages = estimatePagesByWords(scriptText);
  const sceneCount = countScenes(scriptText);
  const minPages = minPagesTargetForMinutes(minutes);
  const tooShort = minutes > 15 && estPages < minPages;

  console.log(`[${requestId}] Script stats:`, {
    words,
    estPages,
    wordsPerPage: SCRIPT_WORDS_PER_PAGE,
    minPagesTarget: minPages,
    tooShort,
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
      words,
      estimatedPages: estPages,
      minPagesTarget: minPages,
      tooShort,
      targetMinutes: minutes,
      sceneCount,
      characterCount: characters.length,
    },
  };
}

export async function POST(request: NextRequest) {
  const requestId = makeRequestId();
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

    console.log(`[${requestId}] Received request:`, {
      step,
      isStepMode,
      movieIdea: !!movieIdea,
      movieGenre,
      scriptLength,
      parsedMinutes: scriptLength ? parseDurationToMinutes(scriptLength) : null,
      hasScript: !!script,
      hasScriptContent: !!scriptContent,
      charactersCount: Array.isArray(characters) ? characters.length : 0,

      // ✅ echo feature env controls on every request
      FEATURE_DEBUG_CHUNKS: process.env.FEATURE_DEBUG_CHUNKS || "(unset)",
      FEATURE_CONTINUE_PASSES: process.env.FEATURE_CONTINUE_PASSES || "(unset)",
      FEATURE_MIN_WORD_RATIO: process.env.FEATURE_MIN_WORD_RATIO || "(unset)",
      FEATURE_CONTINUE_TAIL_CHARS: process.env.FEATURE_CONTINUE_TAIL_CHARS || "(unset)",
      SCRIPT_CHUNK_CONCURRENCY: process.env.SCRIPT_CHUNK_CONCURRENCY || "(unset)",
      OPENAI_MAX_COMPLETION_TOKENS_CAP: process.env.OPENAI_MAX_COMPLETION_TOKENS_CAP || "(unset)",
      SCRIPT_WORDS_PER_PAGE: SCRIPT_WORDS_PER_PAGE,

      modelText: process.env.OPENAI_MODEL_TEXT || "(unset)",
      modelJson: process.env.OPENAI_MODEL_JSON || "(unset)",
      fallbackText: process.env.OPENAI_FALLBACK_MODEL_TEXT || "(unset)",
      fallbackJson: process.env.OPENAI_FALLBACK_MODEL_JSON || "(unset)",
      vercelMaxDuration: String(maxDuration),
      stepScriptTrimChars: STEP_SCRIPT_TRIM_CHARS,
    });

    if (isStepMode && !ALLOWED_STEPS.has(step)) {
      return jsonError(
        `Invalid step "${step}". Allowed: ${Array.from(ALLOWED_STEPS).join(", ")}`,
        400,
        { requestId }
      );
    }

    // If NOT step mode, we’re generating the full package (script + meta)
    if (!isStepMode) {
      if (!movieIdea || !movieGenre || !scriptLength) {
        return jsonError("movieIdea, movieGenre, and scriptLength are required for script generation.", 400, {
          requestId,
        });
      }

      const scriptResult = await generateScriptData(String(movieIdea), String(movieGenre), String(scriptLength), requestId);
      const minutes = parseDurationToMinutes(String(scriptLength));

      const warning =
        scriptResult.stats.tooShort
          ? {
              code: "SCRIPT_TOO_SHORT_FOR_FEATURE",
              message: `Generated script appears short for ${minutes} min selection (${scriptResult.stats.estimatedPages} pages est; target >= ${scriptResult.stats.minPagesTarget}).`,
              hint:
                "Fix is in lib/generators.ts: ensure feature continuation/padding is active in prod. Set FEATURE_CONTINUE_PASSES=4, FEATURE_MIN_WORD_RATIO=0.95, FEATURE_CONTINUE_TAIL_CHARS=3500, OPENAI_MAX_COMPLETION_TOKENS_CAP=12000, SCRIPT_WORDS_PER_PAGE=110 (or 100-130 for realistic screenplay) and redeploy. Also set FEATURE_DEBUG_CHUNKS=1 to verify pad passes run.",
            }
          : null;

      return NextResponse.json({
        requestId,
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
        warning,
        meta: {
          step: "script",
          ms: Date.now() - startedAt,
          modelText: process.env.OPENAI_MODEL_TEXT || "(unset)",
          modelJson: process.env.OPENAI_MODEL_JSON || "(unset)",
          fallbackText: process.env.OPENAI_FALLBACK_MODEL_TEXT || "(unset)",
          fallbackJson: process.env.OPENAI_FALLBACK_MODEL_JSON || "(unset)",
          wordsPerPageUsed: SCRIPT_WORDS_PER_PAGE,
        },
      });
    }

    // Step mode handlers
    switch (step) {
      case "script": {
        if (!movieIdea || !movieGenre || !scriptLength) {
          return jsonError("movieIdea, movieGenre, and scriptLength are required for script generation.", 400, {
            requestId,
          });
        }

        const scriptResult = await generateScriptData(String(movieIdea), String(movieGenre), String(scriptLength), requestId);
        const minutes = parseDurationToMinutes(String(scriptLength));

        const warning =
          scriptResult.stats.tooShort
            ? {
                code: "SCRIPT_TOO_SHORT_FOR_FEATURE",
                message: `Generated script appears short for ${minutes} min selection (${scriptResult.stats.estimatedPages} pages est; target >= ${scriptResult.stats.minPagesTarget}).`,
              }
            : null;

        return NextResponse.json({
          requestId,
          idea: movieIdea,
          genre: movieGenre,
          length: `${minutes} min`,
          logline: scriptResult.logline,
          synopsis: scriptResult.synopsis,
          script: scriptResult.scriptText,
          scriptText: scriptResult.scriptText,
          shortScript: scriptResult.shortScript,
          themes: scriptResult.themes,
          characters: scriptResult.characters,
          stats: scriptResult.stats,
          warning,
          meta: { step, ms: Date.now() - startedAt, wordsPerPageUsed: SCRIPT_WORDS_PER_PAGE },
        });
      }

      case "characters": {
        const contentRaw = scriptContent || script;
        if (!contentRaw) return jsonError("scriptContent (or script) is required for generating characters.", 400, { requestId });

        const content = truncateText(contentRaw, STEP_SCRIPT_TRIM_CHARS);

        const result = await withTimeout(
          generateCharacters(String(content), String(movieGenre || "")),
          120_000,
          "generateCharacters"
        );

        return NextResponse.json({ requestId, ...result, meta: { step, ms: Date.now() - startedAt } });
      }

      case "concept": {
        const contentRaw = scriptContent || script;
        if (!contentRaw) return jsonError("script (or scriptContent) is required for generating concept.", 400, { requestId });

        const content = truncateText(contentRaw, STEP_SCRIPT_TRIM_CHARS);

        const result = await withTimeout(
          generateConcept(String(content), String(movieGenre || "")),
          120_000,
          "generateConcept"
        );

        return NextResponse.json({ requestId, ...result, meta: { step, ms: Date.now() - startedAt } });
      }

      case "storyboard": {
        if (!movieIdea || !movieGenre || !scriptLength) {
          return jsonError("movieIdea, movieGenre, and scriptLength are required for storyboard.", 400, { requestId });
        }

        const contentRaw = scriptContent || script;
        if (!contentRaw) return jsonError("script (or scriptContent) is required for storyboard generation.", 400, { requestId });

        const content = truncateText(contentRaw, STEP_SCRIPT_TRIM_CHARS);

        const frames: StoryboardFrame[] = await withTimeout(
          generateStoryboard({
            movieIdea: String(movieIdea),
            movieGenre: String(movieGenre),
            script: String(content),
            scriptLength: String(scriptLength),
            characters: (Array.isArray(characters) ? (characters as Character[]) : []) || [],
          }),
          180_000,
          "generateStoryboard"
        );

        const mapShot = (shot: any) => ({
          scene: shot.scene || "",
          shotNumber: shot.shotNumber || "",
          description: shot.description || "",
          shotSize: shot.shotSize || "",
          cameraAngle: shot.cameraAngle || "",
          cameraMovement: shot.cameraMovement || "",
          lens: shot.lens || "",
          lighting: shot.lighting || "",
          composition: shot.composition || "",
          duration: shot.duration || "",
          dialogue: shot.dialogue || "",
          soundEffects: shot.soundEffects || "",
          actionNotes: shot.actionNotes || "",
          transition: shot.transition || "",
          notes: shot.notes || "",
          imagePrompt: shot.imagePrompt || "",
          imageUrl: shot.imageUrl || "",
        });

        return NextResponse.json({
          requestId,
          storyboard: (frames || []).map((frame) => ({
            ...mapShot(frame),
            coverageShots: (frame.coverageShots || []).map(mapShot),
          })),
          meta: { step, ms: Date.now() - startedAt },
        });
      }

      case "budget": {
        if (!movieGenre || !scriptLength) return jsonError("movieGenre and scriptLength are required for budget.", 400, { requestId });

        const result = await withTimeout(
          generateBudget(String(movieGenre), String(scriptLength)),
          90_000,
          "generateBudget"
        );

        return NextResponse.json({ requestId, ...result, meta: { step, ms: Date.now() - startedAt } });
      }

      case "schedule": {
        const contentRaw = scriptContent || script;
        if (!contentRaw || !scriptLength) {
          return jsonError("script (or scriptContent) and scriptLength are required for schedule.", 400, { requestId });
        }

        const content = truncateText(contentRaw, STEP_SCRIPT_TRIM_CHARS);

        const result = await withTimeout(
          generateSchedule(String(content), String(scriptLength)),
          120_000,
          "generateSchedule"
        );

        return NextResponse.json({ requestId, ...result, meta: { step, ms: Date.now() - startedAt } });
      }

      case "locations": {
        const contentRaw = scriptContent || script;
        if (!contentRaw) return jsonError("script (or scriptContent) is required for locations.", 400, { requestId });

        const content = truncateText(contentRaw, STEP_SCRIPT_TRIM_CHARS);

        const result = await withTimeout(
          generateLocations(String(content), String(movieGenre || "")),
          120_000,
          "generateLocations"
        );

        return NextResponse.json({ requestId, ...result, meta: { step, ms: Date.now() - startedAt } });
      }

      case "sound": {
        const contentRaw = scriptContent || script;
        if (!contentRaw) return jsonError("script (or scriptContent) is required for sound assets.", 400, { requestId });

        const content = truncateText(contentRaw, STEP_SCRIPT_TRIM_CHARS);

        const result = await withTimeout(
          generateSoundAssets(String(content), String(movieGenre || "")),
          120_000,
          "generateSoundAssets"
        );

        return NextResponse.json({ requestId, ...result, meta: { step, ms: Date.now() - startedAt } });
      }

      default:
        return jsonError("Unhandled step.", 400, { requestId });
    }
  } catch (error: any) {
    const normalized = normalizeOpenAIError(error);

    console.error(`[${requestId}] [API] Generation error:`, error, { input: body || "No input available" });

    return NextResponse.json(
      {
        requestId,
        error: normalized.message || "Failed to generate film package. Please try again later.",
        hint: normalized.hint,
        details: error?.stack || "No stack trace available",
        meta: {
          ms: Date.now() - startedAt,
          modelText: process.env.OPENAI_MODEL_TEXT || "(unset)",
          modelJson: process.env.OPENAI_MODEL_JSON || "(unset)",
          fallbackText: process.env.OPENAI_FALLBACK_MODEL_TEXT || "(unset)",
          fallbackJson: process.env.OPENAI_FALLBACK_MODEL_JSON || "(unset)",
          wordsPerPageUsed: SCRIPT_WORDS_PER_PAGE,
        },
      },
      { status: normalized.status || 500 }
    );
  }
}