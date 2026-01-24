// C:\Users\vizir\VizirPro\lib\generators.ts
import OpenAI from "openai";

/**
 * ✅ Build-safe OpenAI init (prevents Vercel build crash when env vars aren't present at build time)
 * - DO NOT instantiate OpenAI at module load.
 * - Lazily init at runtime when the API route is called.
 * - Also guard against accidental client-side import.
 */
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (typeof window !== "undefined") {
    throw new Error("lib/generators.ts must only run on the server (API route).");
  }

  if (_openai) return _openai;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it in Vercel Project Settings → Environment Variables (Production + Preview)."
    );
  }

  _openai = new OpenAI({ apiKey });
  return _openai;
}

// ✅ Model defaults (set these in Vercel env vars for Production + Preview)
const MODEL_TEXT = process.env.OPENAI_MODEL_TEXT || "gpt-5.2"; // screenplay text
const MODEL_JSON = process.env.OPENAI_MODEL_JSON || "gpt-5.2"; // structured JSON outputs

// ✅ Debug + timeout guards (prevents hidden SDK retries / runaway outline loops)
const DEBUG_OUTLINE = process.env.DEBUG_OUTLINE === "1";
const OUTLINE_USE_JSON_SCHEMA = process.env.OUTLINE_USE_JSON_SCHEMA !== "0"; // set to "0" to force json_object for outline calls
const OUTLINE_TOTAL_BUDGET_MS = parseInt(process.env.OUTLINE_TOTAL_BUDGET_MS || "120000", 10); // 2 minutes
const OUTLINE_CALL_TIMEOUT_MS = parseInt(process.env.OUTLINE_CALL_TIMEOUT_MS || "45000", 10); // 45 seconds per outline call
const DEFAULT_JSON_CALL_TIMEOUT_MS = parseInt(process.env.DEFAULT_JSON_CALL_TIMEOUT_MS || "60000", 10); // 60 seconds
const DEFAULT_TEXT_CALL_TIMEOUT_MS = parseInt(process.env.DEFAULT_TEXT_CALL_TIMEOUT_MS || "90000", 10); // 90 seconds

// ---------- Helpers for OpenAI calls ----------

type ChatOptions = {
  model?: string;
  temperature?: number;

  /**
   * ✅ IMPORTANT:
   * Some models reject `max_tokens` and require `max_completion_tokens`.
   * We keep `max_tokens` as an alias for your existing code, but we DO NOT send it to OpenAI.
   */
  max_completion_tokens?: number;
  max_tokens?: number; // alias (never forwarded)

  // Supported  params (optional)
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string | string[];
  seed?: number;

  // app-only extras (NEVER forwarded to OpenAI)
  schema_name?: string; // json_schema name
  request_tag?: string; // debug logging tag
  timeout_ms?: number; // per-request timeout
  max_retries?: number; // overrides SDK retries (default is 2; we want 0 for Vercel safety)
  debug?: boolean; // verbose logs
  force_json_object?: boolean; // force json_object even if schema enabled
};

function pickCompletionParams(options: ChatOptions) {
  // Only include keys OpenAI accepts — prevents “unknown param” crashes.
  const out: any = {};

  if (typeof options.temperature === "number") out.temperature = options.temperature;

  // ✅ Use max_completion_tokens (never max_tokens)
  const mct =
    typeof options.max_completion_tokens === "number"
      ? options.max_completion_tokens
      : typeof options.max_tokens === "number"
      ? options.max_tokens
      : undefined;

  if (typeof mct === "number") out.max_completion_tokens = mct;

  if (typeof options.top_p === "number") out.top_p = options.top_p;
  if (typeof options.presence_penalty === "number") out.presence_penalty = options.presence_penalty;
  if (typeof options.frequency_penalty === "number") out.frequency_penalty = options.frequency_penalty;
  if (typeof options.seed === "number") out.seed = options.seed;
  if (typeof options.stop === "string" || Array.isArray(options.stop)) out.stop = options.stop;

  return out;
}

function nowMs() {
  return Date.now();
}

function timeLeftMs(deadlineMs: number) {
  return deadlineMs - nowMs();
}

function extractUsage(completion: any) {
  return completion?.usage ?? (completion as any)?.usage ?? null;
}

function extractMsgContent(choice: any): string {
  const content = choice?.message?.content ?? "";
  if (typeof content === "string") return content;
  // Some SDKs can return array content parts; join text parts if present
  if (Array.isArray(content)) {
    return content
      .map((p: any) => {
        if (typeof p === "string") return p;
        if (p?.type === "text" && typeof p?.text === "string") return p.text;
        if (typeof p?.text === "string") return p.text;
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

function stripCodeFences(s: string) {
  let t = (s ?? "").trim();
  if (t.startsWith("```json")) t = t.slice(7).trim();
  if (t.startsWith("```")) t = t.slice(3).trim();
  if (t.endsWith("```")) t = t.slice(0, -3).trim();
  return t;
}

function looksTruncatedJson(raw: string) {
  const t = (raw ?? "").trim();
  if (!t) return false;

  if (t.startsWith("{") && !t.endsWith("}")) return true;
  if (t.startsWith("[") && !t.endsWith("]")) return true;

  const opens = (t.match(/{/g) || []).length;
  const closes = (t.match(/}/g) || []).length;
  if (opens > closes) return true;

  const opensA = (t.match(/\[/g) || []).length;
  const closesA = (t.match(/\]/g) || []).length;
  if (opensA > closesA) return true;

  return false;
}

/**
 * ✅ safer JSON parse:
 * - detects likely truncation and returns null (prevents "partial object" mis-parse)
 * - strips fences
 * - attempts best-effort extraction of largest {...} object
 */
function safeParse<T = any>(raw: string, tag = "json"): T | null {
  try {
    const cleaned = stripCodeFences(String(raw ?? ""));

    if (looksTruncatedJson(cleaned)) {
      console.error(`safeParse failed [${tag}] likely truncated len=${cleaned.length}`);
      return null;
    }

    return JSON.parse(cleaned) as T;
  } catch (e) {
    const str = stripCodeFences(String(raw ?? ""));
    const i = str.indexOf("{");
    const j = str.lastIndexOf("}");
    if (i >= 0 && j > i) {
      const candidate = str.slice(i, j + 1).trim();
      if (!looksTruncatedJson(candidate)) {
        try {
          return JSON.parse(candidate) as T;
        } catch {}
      }
    }
    console.error(`safeParse failed [${tag}] len=${raw?.length}`, e);
    return null;
  }
}

async function callOpenAI(
  prompt: string,
  options: ChatOptions = {}
): Promise<{ content: string; finish_reason: string }> {
  // JSON-oriented helper (use for simple JSON calls)
  const openai = getOpenAI();

  const timeout =
    typeof options.timeout_ms === "number" ? options.timeout_ms : DEFAULT_JSON_CALL_TIMEOUT_MS;
  const maxRetries = typeof options.max_retries === "number" ? options.max_retries : 0;

  const completion = await openai.chat.completions.create(
    {
      model: options.model || MODEL_JSON,
      messages: [
        {
          role: "system",
          content:
            "You are an expert film development AI. Return ONLY valid JSON. No markdown, no commentary.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      ...pickCompletionParams(options),
    },
    { timeout, maxRetries }
  );

  const choice = completion.choices[0];
  let content = extractMsgContent(choice) ?? "";
  content = stripCodeFences(content);

  const finish = choice.finish_reason || "stop";

  return {
    content: content.trim(),
    finish_reason: finish,
  };
}

async function callOpenAIText(
  prompt: string,
  options: ChatOptions = {}
): Promise<{ content: string; finish_reason: string }> {
  // Text-only helper (use for screenplay chunks). No JSON formatting pressure.
  const openai = getOpenAI();

  const timeout =
    typeof options.timeout_ms === "number" ? options.timeout_ms : DEFAULT_TEXT_CALL_TIMEOUT_MS;
  const maxRetries = typeof options.max_retries === "number" ? options.max_retries : 0;

  const completion = await openai.chat.completions.create(
    {
      model: options.model || MODEL_TEXT,
      messages: [
        {
          role: "system",
          content: `
You are a professional screenwriter. Output ONLY screenplay text in **Fountain** format.

STRICT READABILITY / PACING RULES (very important):
- Use SCENE HEADINGS (INT./EXT. LOCATION - DAY/NIGHT) frequently.
- NEVER write more than ~350–450 words without a new slug line (INT./EXT.).
- Keep scenes moving: short action paragraphs, purposeful dialogue beats.

FORMAT RULES:
- Action in present tense.
- CHARACTER names uppercase; dialogue under names.
- No summaries, no analysis, no JSON, no commentary.
- Do NOT add meta headers like "PART 1" or "CHUNK 2".
- Continue seamlessly with proper scene headings.
`.trim(),
        },
        { role: "user", content: prompt },
      ],
      ...pickCompletionParams({
        ...options,
        // keep your defaults, but allow override
        temperature: typeof options.temperature === "number" ? options.temperature : 0.85,
        // alias-supported: will become max_completion_tokens
        max_tokens: typeof options.max_tokens === "number" ? options.max_tokens : 4096,
        max_completion_tokens:
          typeof options.max_completion_tokens === "number" ? options.max_completion_tokens : undefined,
      }),
    },
    { timeout, maxRetries }
  );

  const choice = completion.choices[0];
  const msg = choice.message;

  return {
    content: (extractMsgContent({ message: msg }) ?? "").trim(),
    finish_reason: choice.finish_reason || "stop",
  };
}

/**
 * ✅ Structured Outputs helper for schema-locked JSON.
 * - Treats finish_reason === "length" as failure (prevents parsing truncated JSON).
 * - Disables SDK retries by default (maxRetries: 0) to avoid Vercel timeout spirals.
 * - Allows forcing json_object mode via OUTLINE_USE_JSON_SCHEMA=0 or options.force_json_object.
 */
async function callOpenAIJsonSchema<T>(
  prompt: string,
  jsonSchema: any,
  options: ChatOptions = {}
): Promise<{
  data: T | null;
  content: string;
  finish_reason: string;
  used_schema: boolean;
  meta?: { content_len: number; usage: any; finish_reason: string };
}> {
  const openai = getOpenAI();

  const messages = [
    {
      role: "system" as const,
      content:
        "Return ONLY valid JSON that conforms exactly to the provided schema. No extra keys. No markdown.",
    },
    { role: "user" as const, content: prompt },
  ];

  const schemaName = (options.schema_name as string) || "FilmJSON";
  const tag = (options.request_tag as string) || "jsonschema";
  const debug = Boolean(options.debug) || DEBUG_OUTLINE;

  const timeout =
    typeof options.timeout_ms === "number"
      ? options.timeout_ms
      : tag.startsWith("outline")
      ? OUTLINE_CALL_TIMEOUT_MS
      : DEFAULT_JSON_CALL_TIMEOUT_MS;

  const maxRetries = typeof options.max_retries === "number" ? options.max_retries : 0;

  const wantSchema = OUTLINE_USE_JSON_SCHEMA && options.force_json_object !== true;

  if (wantSchema) {
    try {
      const completion = await openai.chat.completions.create(
        {
          model: options.model || MODEL_JSON,
          messages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: schemaName,
              schema: jsonSchema,
              strict: true,
            },
          },
          ...pickCompletionParams({
            ...options,
            temperature: typeof options.temperature === "number" ? options.temperature : 0.3,
            // alias-supported: will become max_completion_tokens
            max_tokens: typeof options.max_tokens === "number" ? options.max_tokens : 4500,
            max_completion_tokens:
              typeof options.max_completion_tokens === "number"
                ? options.max_completion_tokens
                : undefined,
          }),
        },
        { timeout, maxRetries }
      );

      const choice = completion.choices[0];
      const finish = choice.finish_reason || "stop";
      let content = stripCodeFences(extractMsgContent(choice) ?? "");

      const usage = extractUsage(completion);
      const meta = { content_len: content.length, usage, finish_reason: finish };

      if (debug) {
        console.log(
          `[${tag}] used_schema=true finish=${finish} chars=${content.length} usage=${
            usage ? JSON.stringify(usage) : "n/a"
          }`
        );
      }

      if (finish === "length" || looksTruncatedJson(content)) {
        if (debug) console.log(`[${tag}] detected truncation (finish=length or incomplete JSON).`);
        return { data: null, content: content.trim(), finish_reason: finish, used_schema: true, meta };
      }

      const data = safeParse<T>(content, `${tag}-json_schema`);
      return {
        data,
        content: content.trim(),
        finish_reason: finish,
        used_schema: true,
        meta,
      };
    } catch (err) {
      if (debug) console.log(`[${tag}] schema call threw; falling back to json_object.`, err);
    }
  }

  // Fallback: JSON mode
  const { content, finish_reason } = await callOpenAI(prompt, {
    ...options,
    temperature: typeof options.temperature === "number" ? options.temperature : 0.3,
    // alias-supported: will become max_completion_tokens via pickCompletionParams in callOpenAI
    max_tokens: typeof options.max_tokens === "number" ? options.max_tokens : 4500,
    timeout_ms: timeout,
    max_retries: maxRetries,
  });

  const data = safeParse<T>(content, `${tag}-json_object-fallback`);
  const meta = { content_len: content.length, usage: null, finish_reason };

  if (debug) {
    console.log(`[${tag}] used_schema=false finish=${finish_reason} chars=${content.length} usage=n/a`);
  }

  return { data, content, finish_reason, used_schema: false, meta };
}

// ---------- Types ----------

export interface Character {
  name: string;
  description: string;
  role?: string;
  traits?: string[];
  skinColor?: string;
  hairColor?: string;
  clothingColor?: string;
  mood?: string;
  visualDescription?: string;
  imageUrl?: string;
}

export interface StoryboardFrame {
  scene: string;
  shotNumber: string;
  description: string;
  cameraAngle?: string;
  cameraMovement?: string;
  lens?: string;
  lighting?: string;
  duration?: string;
  dialogue?: string;
  soundEffects?: string;
  notes?: string;
  imagePrompt?: string;
  imageUrl?: string;
  coverageShots?: StoryboardFrame[];
}

export interface ShortScriptItem {
  act?: number;
  sceneNumber?: number;
  heading?: string;
  summary?: string;
  scene?: string;
  description?: string;
  dialogue?: string;
}

// ---------- Utility ----------

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function tail(text: string, maxChars = 4000) {
  if (!text) return "";
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

function parseLengthToMinutes(raw: string): number {
  if (!raw) return 5;
  const s = String(raw).trim().toLowerCase();

  if (s.includes("feature")) return 120;
  if (s.includes("short")) return 10;

  const colon = s.match(/\b(\d{1,2})\s*:\s*(\d{1,2})\b/);
  if (colon) {
    const hh = parseInt(colon[1], 10);
    const mm = parseInt(colon[2], 10);
    if (!isNaN(hh) && !isNaN(mm)) return Math.max(1, hh * 60 + mm);
  }

  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour|hours)\b/);
  const minMatch = s.match(/(\d{1,3})\s*(m|min|mins|minute|minutes)\b/);

  const hours = hourMatch ? parseFloat(hourMatch[1]) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;

  if (hours && !isNaN(hours)) {
    const total = Math.round(hours * 60) + (isNaN(mins) ? 0 : mins);
    return Math.max(1, total);
  }

  if (minMatch && !isNaN(mins)) return Math.max(1, mins);

  const numMatch = s.match(/(\d{1,3})/);
  if (numMatch) {
    const m = parseInt(numMatch[1], 10);
    if (!isNaN(m)) return Math.max(1, m);
  }

  return 5;
}

/**
 * ✅ Safer: only removes duplicate FADE IN lines (line-anchored),
 * so it won't accidentally remove "fade in" in action/dialogue.
 */
function stripExtraFadeIn(text: string) {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";

  const lines = raw.split("\n");
  const fadeLine = /^\s*FADE IN:?\s*$/i;

  let firstFound = false;
  const out: string[] = [];

  for (const line of lines) {
    if (fadeLine.test(line)) {
      if (!firstFound) {
        firstFound = true;
        out.push("FADE IN:");
      }
      continue;
    }
    out.push(line);
  }

  return out.join("\n").trim();
}

// Helper: simple delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ✅ Concurrency-limited mapper (prevents rate spikes; keeps outputs in order)
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array(items.length) as R[];
  const concurrency = Math.max(1, Math.min(limit, items.length));
  let next = 0;

  const workers = Array.from({ length: concurrency }, () =>
    (async () => {
      while (true) {
        const idx = next++;
        if (idx >= items.length) break;
        results[idx] = await fn(items[idx], idx);
      }
    })()
  );

  await Promise.all(workers);
  return results;
}

// ---------- Schemas for all generators (PRO reliability) ----------

function buildShortMetaSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["logline", "synopsis", "themes", "shortScript"],
    properties: {
      logline: { type: "string" },
      synopsis: { type: "string" },
      themes: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 7 },
      shortScript: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["scene", "description", "dialogue"],
          properties: {
            scene: { type: "string" },
            description: { type: "string" },
            dialogue: { type: "string" },
          },
        },
      },
    },
  };
}

function buildCharactersSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["characters"],
    properties: {
      characters: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "role",
            "description",
            "traits",
            "skinColor",
            "hairColor",
            "clothingColor",
            "mood",
            "visualDescription",
            "imageUrl",
          ],
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            description: { type: "string" },
            traits: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 8 },
            skinColor: { type: "string" },
            hairColor: { type: "string" },
            clothingColor: { type: "string" },
            mood: { type: "string" },
            visualDescription: { type: "string" },
            imageUrl: { type: "string" },
          },
        },
      },
    },
  };
}

function buildStoryboardSchema() {
  // We normalize counts in code, so schema allows a range.
  const shotSchema = {
    type: "object",
    additionalProperties: false,
    required: ["scene", "shotNumber", "description", "imagePrompt", "imageUrl"],
    properties: {
      scene: { type: "string" },
      shotNumber: { type: "string" },
      description: { type: "string" },
      cameraAngle: { type: "string" },
      cameraMovement: { type: "string" },
      lens: { type: "string" },
      lighting: { type: "string" },
      duration: { type: "string" },
      dialogue: { type: "string" },
      soundEffects: { type: "string" },
      notes: { type: "string" },
      imagePrompt: { type: "string" },
      imageUrl: { type: "string" },
      coverageShots: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["scene", "shotNumber", "description", "imagePrompt", "imageUrl"],
          properties: {
            scene: { type: "string" },
            shotNumber: { type: "string" },
            description: { type: "string" },
            cameraAngle: { type: "string" },
            cameraMovement: { type: "string" },
            lens: { type: "string" },
            lighting: { type: "string" },
            duration: { type: "string" },
            dialogue: { type: "string" },
            soundEffects: { type: "string" },
            notes: { type: "string" },
            imagePrompt: { type: "string" },
            imageUrl: { type: "string" },
          },
        },
        minItems: 0,
        maxItems: 6,
      },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: ["storyboard"],
    properties: {
      storyboard: {
        type: "array",
        minItems: 1,
        maxItems: 200,
        items: shotSchema,
      },
    },
  };
}

function buildConceptSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["concept", "visualReferences"],
    properties: {
      concept: {
        type: "object",
        additionalProperties: false,
        required: [
          "visualStyle",
          "colorPalette",
          "cameraTechniques",
          "lightingApproach",
          "thematicSymbolism",
          "productionValues",
        ],
        properties: {
          visualStyle: { type: "string" },
          colorPalette: { type: "string" },
          cameraTechniques: { type: "string" },
          lightingApproach: { type: "string" },
          thematicSymbolism: { type: "string" },
          productionValues: { type: "string" },
        },
      },
      visualReferences: {
        type: "array",
        minItems: 0,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["description", "imageUrl"],
          properties: {
            description: { type: "string" },
            imageUrl: { type: "string" },
          },
        },
      },
    },
  };
}

function buildBudgetSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["categories"],
    properties: {
      categories: {
        type: "array",
        minItems: 3,
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "amount", "percentage", "items", "tips", "alternatives"],
          properties: {
            name: { type: "string" },
            amount: { type: "number" },
            percentage: { type: "number" },
            items: {
              type: "array",
              minItems: 1,
              maxItems: 25,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "cost"],
                properties: {
                  name: { type: "string" },
                  cost: { type: "number" },
                },
              },
            },
            tips: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 12 },
            alternatives: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 12 },
          },
        },
      },
    },
  };
}

function buildScheduleSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schedule"],
    properties: {
      schedule: {
        type: "array",
        minItems: 1,
        maxItems: 60,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["day", "activities", "duration"],
          properties: {
            day: { type: "string" },
            activities: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 20 },
            duration: { type: "string" },
            location: { type: "string" },
            crew: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 25 },
          },
        },
      },
    },
  };
}

function buildLocationsSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["locations"],
    properties: {
      locations: {
        type: "array",
        minItems: 1,
        maxItems: 80,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "type",
            "description",
            "mood",
            "colorPalette",
            "propsOrFeatures",
            "scenes",
            "rating",
            "lowBudgetTips",
            "highBudgetOpportunities",
          ],
          properties: {
            name: { type: "string" },
            type: { type: "string" },
            description: { type: "string" },
            mood: { type: "string" },
            colorPalette: { type: "string" },
            propsOrFeatures: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 25 },
            scenes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 20 },
            rating: { type: "number", minimum: 1, maximum: 5 },
            lowBudgetTips: { type: "string" },
            highBudgetOpportunities: { type: "string" },
          },
        },
      },
    },
  };
}

function buildSoundAssetsSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["soundAssets"],
    properties: {
      soundAssets: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "type", "duration", "description", "scenes", "audioUrl"],
          properties: {
            name: { type: "string" },
            type: { type: "string" },
            duration: { type: "string" },
            description: { type: "string" },
            scenes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 30 },
            audioUrl: { type: "string" },
          },
        },
      },
    },
  };
}

// ---------- Robust Outline helper ----------

type OutlineResult = {
  logline: string;
  synopsis: string;
  themes: string[];
  shortScript: ShortScriptItem[];
};

function computeSceneCap(targetPages: number, approxScenes: number) {
  let cap = approxScenes;

  if (targetPages >= 110) cap = Math.min(approxScenes, 65);
  else if (targetPages >= 90) cap = Math.min(approxScenes, 60);
  else if (targetPages >= 60) cap = Math.min(approxScenes, 55);
  else if (targetPages >= 30) cap = Math.min(approxScenes, 50);
  else cap = Math.min(approxScenes, 40);

  return Math.max(12, cap);
}

function buildOutlineSchema(sceneCap: number) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["logline", "synopsis", "themes", "shortScript"],
    properties: {
      logline: { type: "string" },
      synopsis: { type: "string" },
      themes: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 7,
      },
      shortScript: {
        type: "array",
        minItems: sceneCap,
        maxItems: sceneCap,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["act", "sceneNumber", "heading", "summary"],
          properties: {
            act: { type: "integer", minimum: 1, maximum: 3 },
            sceneNumber: { type: "integer", minimum: 1, maximum: 1000 },
            heading: { type: "string" },
            summary: { type: "string" },
          },
        },
      },
    },
  };
}

function buildActsSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["logline", "synopsis", "themes", "acts"],
    properties: {
      logline: { type: "string" },
      synopsis: { type: "string" },
      themes: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 7,
      },
      acts: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["act", "summary"],
          properties: {
            act: { type: "integer", minimum: 1, maximum: 3 },
            summary: { type: "string" },
          },
        },
      },
    },
  };
}

function buildScenesOnlySchema(sceneCap: number) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["shortScript"],
    properties: {
      shortScript: {
        type: "array",
        minItems: sceneCap,
        maxItems: sceneCap,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["act", "sceneNumber", "heading", "summary"],
          properties: {
            act: { type: "integer", minimum: 1, maximum: 3 },
            sceneNumber: { type: "integer", minimum: 1, maximum: 1000 },
            heading: { type: "string" },
            summary: { type: "string" },
          },
        },
      },
    },
  };
}

function buildActScenesSchema(sceneCount: number) {
  return buildScenesOnlySchema(sceneCount);
}

function makePlaceholderScenes(count: number, act: 1 | 2 | 3) {
  return Array.from({ length: count }, (_, i) => ({
    act,
    sceneNumber: i + 1,
    heading: i % 2 === 0 ? "INT. LOCATION - DAY" : "EXT. LOCATION - NIGHT",
    summary: `Act ${act} beat placeholder. Expand during writing; escalate conflict and maintain continuity.`,
  })) as ShortScriptItem[];
}

async function repairOutlineJson(params: {
  raw: string;
  sceneCap: number;
  synopsisLength: string;
  summaryRule: string;
  idea: string;
  genre: string;
  targetPages: number;
}) {
  const { raw, sceneCap, synopsisLength, summaryRule, idea, genre, targetPages } = params;

  const prompt = `
You will be given malformed or non-conforming JSON. Repair it into a SINGLE valid JSON object that matches the schema exactly.

Constraints:
- Keep the same story content as much as possible.
- Ensure shortScript has exactly ${sceneCap} items.
- ${summaryRule}
- Fix escaping, quotes, commas, and remove any extra keys.

Idea: ${idea}
Genre: ${genre}
Target pages: ${targetPages}
Synopsis target: ${synopsisLength}

BROKEN_JSON:
${raw}
`.trim();

  const schema = buildOutlineSchema(sceneCap);
  const repaired = await callOpenAIJsonSchema<OutlineResult>(prompt, schema, {
    temperature: 0.2,
    max_tokens: 3200,
    request_tag: "outline-repair",
    schema_name: "OutlineRepair",
    timeout_ms: OUTLINE_CALL_TIMEOUT_MS,
    max_retries: 0,
  });

  return repaired.data;
}

/**
 * ✅ Act-splitting scenes (3 small calls) to prevent huge JSON truncation.
 * This is now the primary method for features (targetPages >= 45).
 */
async function getActSplitOutline(params: {
  idea: string;
  genre: string;
  targetPages: number;
  sceneCap: number;
  synopsisLength: string;
  longForm: boolean;
  summaryRule: string;
  summaryWordSpec: string;
  deadlineMs: number;
}): Promise<OutlineResult | null> {
  const {
    idea,
    genre,
    targetPages,
    sceneCap,
    synopsisLength,
    longForm,
    summaryRule,
    summaryWordSpec,
    deadlineMs,
  } = params;

  if (timeLeftMs(deadlineMs) < 25_000) return null;

  const actSummaryWords = targetPages >= 60 ? "110–150 words" : "140–190 words";

  const actPrompt = `
Create act-level summaries for a ${genre} film from this idea:
${idea}

Constraints:
- 3 acts only.
- Act summaries should be ${actSummaryWords}.
- Themes 3–5 items.
- Synopsis target length: ${synopsisLength}.
Return JSON with {logline, synopsis, themes, acts:[{act, summary}]}.
`.trim();

  const actsRes = await callOpenAIJsonSchema<{
    logline: string;
    synopsis: string;
    themes: string[];
    acts: { act: number; summary: string }[];
  }>(actPrompt, buildActsSchema(), {
    temperature: 0.3,
    max_tokens: 2400,
    request_tag: "outline-acts",
    schema_name: "OutlineActs",
    timeout_ms: OUTLINE_CALL_TIMEOUT_MS,
    max_retries: 0,
    debug: true,
  });

  const actsParsed = actsRes.data;
  if (!actsParsed?.acts?.length || actsParsed.acts.length !== 3) return null;

  const act1 = clamp(Math.round(sceneCap * 0.25), 10, Math.max(10, sceneCap - 22));
  const act2 = clamp(Math.round(sceneCap * 0.5), 14, Math.max(14, sceneCap - act1 - 8));
  const act3 = Math.max(8, sceneCap - act1 - act2);

  const counts: Array<{ act: 1 | 2 | 3; count: number; summary: string }> = [
    { act: 1, count: act1, summary: actsParsed.acts.find((a) => a.act === 1)?.summary || "" },
    { act: 2, count: act2, summary: actsParsed.acts.find((a) => a.act === 2)?.summary || "" },
    { act: 3, count: act3, summary: actsParsed.acts.find((a) => a.act === 3)?.summary || "" },
  ];

  const all: ShortScriptItem[] = [];

  for (const a of counts) {
    if (timeLeftMs(deadlineMs) < 22_000) {
      all.push(...makePlaceholderScenes(a.count, a.act));
      continue;
    }

    let actScenes: ShortScriptItem[] | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const compactRule =
        attempt === 1
          ? `${summaryRule} Keep each summary ${summaryWordSpec}.`
          : `EXTREME COMPACT: summaries 10–16 words max, concrete verbs, no clauses.`;

      const prompt = `
Using the act summary below, generate EXACTLY ${a.count} shortScript scene beats for ACT ${a.act}.

Rules:
- shortScript MUST be exactly ${a.count} items.
- Each item must have:
  - act: MUST be ${a.act} for every item
  - sceneNumber: sequential starting at 1 (within this act)
  - heading: proper slug line like "INT. LOCATION - DAY" (uppercase)
  - summary: action beat (${longForm ? "compact" : "detailed"})
- ${compactRule}
- NO extra keys. NO markdown.

MOVIE IDEA:
${idea}

ACT ${a.act} SUMMARY:
${a.summary}
`.trim();

      const res = await callOpenAIJsonSchema<{ shortScript: ShortScriptItem[] }>(
        prompt,
        buildActScenesSchema(a.count),
        {
          temperature: attempt === 2 ? 0.22 : 0.28,
          max_tokens: attempt === 2 ? 1600 : 2100,
          request_tag: `outline-act${a.act}-scenes-a${attempt}`,
          schema_name: `OutlineAct${a.act}Scenes`,
          timeout_ms: OUTLINE_CALL_TIMEOUT_MS,
          max_retries: 0,
          debug: true,
        }
      );

      if (res.data?.shortScript?.length === a.count) {
        actScenes = res.data.shortScript.map((s, idx) => ({
          ...s,
          act: a.act,
          sceneNumber: idx + 1,
          heading:
            String(s.heading || "").trim() ||
            (idx % 2 === 0 ? "INT. LOCATION - DAY" : "EXT. LOCATION - NIGHT"),
          summary: String(s.summary || "").trim() || "To be expanded during writing.",
        }));
        break;
      }
    }

    if (!actScenes) actScenes = makePlaceholderScenes(a.count, a.act);
    all.push(...actScenes);
  }

  const merged = all.slice(0, sceneCap);
  while (merged.length < sceneCap) {
    merged.push(...makePlaceholderScenes(Math.min(3, sceneCap - merged.length), 2));
  }

  const normalized = merged.map((s, idx) => ({
    ...s,
    sceneNumber: idx + 1,
    act:
      (s.act as any) ||
      (idx < Math.floor(sceneCap * 0.25) ? 1 : idx < Math.floor(sceneCap * 0.75) ? 2 : 3),
  }));

  return {
    logline: actsParsed.logline || "",
    synopsis: actsParsed.synopsis || "",
    themes: actsParsed.themes || [],
    shortScript: normalized,
  };
}

async function getRobustOutline(params: {
  idea: string;
  genre: string;
  targetPages: number;
  approxScenes: number;
  synopsisLength: string;
}): Promise<OutlineResult> {
  const { idea, genre, targetPages, approxScenes, synopsisLength } = params;

  const start = nowMs();
  const deadline = start + OUTLINE_TOTAL_BUDGET_MS;

  const baseSceneCap = computeSceneCap(targetPages, approxScenes);

  const longForm = targetPages >= 60;
  const summaryRule = longForm
    ? "Make scene summaries concrete and compact (12–22 words). Include clear conflict/goal/turn."
    : "Make scene summaries detailed (25–45 words) to guide the writer.";

  const summaryWordSpec = longForm ? "12–22 words" : "25–45 words";

  if (timeLeftMs(deadline) < 25_000) {
    const fallbackLen = Math.max(12, Math.min(40, baseSceneCap));
    return {
      logline: "",
      synopsis: "",
      themes: [],
      shortScript: Array.from({ length: fallbackLen }, (_, i) => ({
        act: i < Math.floor(fallbackLen * 0.25) ? 1 : i < Math.floor(fallbackLen * 0.75) ? 2 : 3,
        sceneNumber: i + 1,
        heading: i % 2 === 0 ? "INT. LOCATION - DAY" : "EXT. LOCATION - NIGHT",
        summary: "To be expanded during writing. Maintain continuity and escalate stakes.",
      })),
    };
  }

  if (targetPages >= 45) {
    const sceneCap = baseSceneCap;

    const split = await getActSplitOutline({
      idea,
      genre,
      targetPages,
      sceneCap,
      synopsisLength,
      longForm,
      summaryRule,
      summaryWordSpec,
      deadlineMs: deadline,
    });

    if (split?.shortScript?.length === sceneCap) return split;
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (timeLeftMs(deadline) < 25_000) break;

    const sceneCap = Math.max(12, baseSceneCap - (attempt - 1) * 10);

    const prompt = `
Generate a detailed film outline for a ${genre} film based on this idea:
${idea}

Rules:
- 1 page ≈ 1 minute; target length ≈ ${targetPages} pages
- shortScript MUST be an array of exactly ${sceneCap} scenes.
- Each shortScript item must be:
  - act: 1, 2, or 3
  - sceneNumber: sequential starting at 1
  - heading: proper slug line like "INT. LOCATION - DAY"
  - summary: action beat (${summaryWordSpec})
- ${summaryRule}
- Themes: 3–5 items.

Synopsis length target: ${synopsisLength}
`.trim();

    const schema = buildOutlineSchema(sceneCap);
    const res = await callOpenAIJsonSchema<OutlineResult>(prompt, schema, {
      temperature: 0.33,
      max_tokens: 4200,
      request_tag: `outline-full-a${attempt}`,
      schema_name: "OutlineFull",
      timeout_ms: OUTLINE_CALL_TIMEOUT_MS,
      max_retries: 0,
      debug: true,
    });

    const parsed = res.data;

    if (
      parsed?.logline &&
      parsed?.synopsis &&
      Array.isArray(parsed?.themes) &&
      Array.isArray(parsed?.shortScript) &&
      parsed.shortScript.length === sceneCap
    ) {
      parsed.shortScript = parsed.shortScript.map((s, idx) => ({
        ...s,
        sceneNumber: idx + 1,
      }));
      return parsed;
    }

    if (!parsed && res.content && res.content.length > 50 && timeLeftMs(deadline) > 20_000) {
      const repaired = await repairOutlineJson({
        raw: res.content,
        sceneCap,
        synopsisLength,
        summaryRule,
        idea,
        genre,
        targetPages,
      });
      if (repaired?.shortScript?.length === sceneCap) {
        repaired.shortScript = repaired.shortScript.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
        return repaired;
      }
    }
  }

  const fallbackLen = Math.max(12, Math.min(40, baseSceneCap));
  return {
    logline: "",
    synopsis: "",
    themes: [],
    shortScript: Array.from({ length: fallbackLen }, (_, i) => ({
      act: i < Math.floor(fallbackLen * 0.25) ? 1 : i < Math.floor(fallbackLen * 0.75) ? 2 : 3,
      sceneNumber: i + 1,
      heading: i % 2 === 0 ? "INT. LOCATION - DAY" : "EXT. LOCATION - NIGHT",
      summary: "To be expanded during writing. Maintain continuity and escalate stakes.",
    })),
  };
}

// ---------- Parallel chunk "bible" for continuity ----------

type ChunkPlan = {
  part: number;
  startScene: number;
  endScene: number;
  startState: string;
  endState: string;
  mustInclude: string[];
  mustAvoid: string[];
};

function buildChunkPlanSchema(partCount: number) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["chunks"],
    properties: {
      chunks: {
        type: "array",
        minItems: partCount,
        maxItems: partCount,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["part", "startScene", "endScene", "startState", "endState", "mustInclude", "mustAvoid"],
          properties: {
            part: { type: "integer", minimum: 1, maximum: 20 },
            startScene: { type: "integer", minimum: 1, maximum: 5000 },
            endScene: { type: "integer", minimum: 1, maximum: 5000 },
            startState: { type: "string" },
            endState: { type: "string" },
            mustInclude: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
            mustAvoid: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 7 },
          },
        },
      },
    },
  };
}

async function getChunkPlans(params: {
  idea: string;
  genre: string;
  targetPages: number;
  outline: OutlineResult;
  chunks: { part: number; startScene: number; endScene: number; beats: string }[];
}): Promise<ChunkPlan[] | null> {
  const { idea, genre, targetPages, outline, chunks } = params;

  const prompt = `
Create a continuity "chunk bible" for parallel screenplay writing.

Movie:
- Genre: ${genre}
- Target pages: ${targetPages}
- Idea: ${idea}

Story Context:
- Logline: ${outline.logline}
- Synopsis: ${outline.synopsis}
- Themes: ${(outline.themes || []).slice(0, 6).join(", ")}

For EACH chunk, define:
- startState: 2–4 sentences describing the exact situation at the START of the chunk
- endState: 2–4 sentences describing the exact situation at the END of the chunk
- mustInclude: 3–8 concrete story requirements that MUST happen in this chunk
- mustAvoid: repetition, contradictions, resets, re-introducing characters as if new, etc.

Chunks:
${chunks
  .map(
    (c) => `
PART ${c.part} — Scenes ${c.startScene} to ${c.endScene}
BEATS (summary):
${c.beats}
`.trim()
  )
  .join("\n\n")}
`.trim();

  const res = await callOpenAIJsonSchema<{ chunks: ChunkPlan[] }>(prompt, buildChunkPlanSchema(chunks.length), {
    temperature: 0.2,
    max_tokens: 1800,
    request_tag: "chunk-bible",
    schema_name: "ChunkBible",
    timeout_ms: DEFAULT_JSON_CALL_TIMEOUT_MS,
    max_retries: 0,
    model: MODEL_JSON,
  });

  if (res.data?.chunks?.length === chunks.length) return res.data.chunks;
  return null;
}

// ---------- GENERATORS ----------

export const generateScript = async (idea: string, genre: string, length: string) => {
  const duration = parseLengthToMinutes(length);
  const targetPages = duration;

  const approxScenes = Math.round(duration);
  const minScenes = Math.max(3, Math.floor(approxScenes * 0.9));
  const maxScenes = Math.ceil(approxScenes * 1.1);

  let structureGuide = "";
  let numActs = 1;
  let numCharacters = 3;
  let synopsisLength = "150 words";

  if (duration <= 1) {
    structureGuide = "A micro-short with 1-2 scenes, visual storytelling, punchy ending.";
    numCharacters = 1;
    synopsisLength = "50 words";
  } else if (duration <= 15) {
    structureGuide = "A short film with clear setup, rising action, and twist/resolution.";
    numActs = 3;
    numCharacters = 3;
    synopsisLength = "200 words";
  } else if (duration <= 60) {
    structureGuide = "A featurette. Streamlined plot, limited locations, focus on one main conflict.";
    numActs = 3;
    numCharacters = 5;
    synopsisLength = "350 words";
  } else if (duration <= 90) {
    structureGuide =
      "A standard feature film (75-90 pages). Tight pacing, no filler scenes, strong three-act structure with subplots and character arcs.";
    numActs = 3;
    numCharacters = 6;
    synopsisLength = "500 words";
  } else {
    structureGuide =
      "An epic feature (100+ pages). Complex subplots, ensemble cast, extended character development.";
    numActs = 3;
    numCharacters = 7;
    synopsisLength = "600 words";
  }

  const basePrompt = `
Generate a professional screenplay for a ${genre} film based on this idea:
${idea}

Specifications:
- Title: Create a catchy title
- Length: Aim for ${targetPages} pages total (1 page ≈ 1 minute, ~220 words per page)
- Scenes: Between ${minScenes} and ${maxScenes} scenes
- Characters: Up to ${numCharacters} main characters
- Structure: ${structureGuide}
- Acts: ${numActs} acts
- Format: Standard screenplay format ONLY (no extra text)
- Themes: 3-5 key themes
- Style: Highly cinematic, detailed action, and natural dialogue with subtext. Do not summarize.
`.trim();

  // --- PATH A: Short scripts (<= 15 min) ---
  if (duration <= 15) {
    const metaPrompt = `${basePrompt}
Return JSON:
{
  "logline": "...",
  "synopsis": "${synopsisLength}",
  "themes": ["..."],
  "shortScript": [{"scene":"...","description":"...","dialogue":"..."}]
}
`.trim();

    const metaRes = await callOpenAIJsonSchema<{
      logline: string;
      synopsis: string;
      themes: string[];
      shortScript: { scene: string; description: string; dialogue: string }[];
    }>(metaPrompt, buildShortMetaSchema(), {
      temperature: 0.35,
      max_tokens: 2400,
      request_tag: "short-meta",
      schema_name: "ShortMeta",
      model: MODEL_JSON,
      max_retries: 0,
    });

    const meta =
      metaRes.data ||
      safeParse(metaRes.content, "short-meta-fallback") || {
        logline: "",
        synopsis: "",
        themes: [],
        shortScript: [],
      };

    const writePrompt = `
Write a screenplay in Fountain format of ~${targetPages} pages (1 page ≈ 220 words).
Start with FADE IN: and include the opening scene heading.
Output screenplay text ONLY. No JSON. No commentary.

Enforcement:
- Use slug lines frequently (INT./EXT.)
- Never go ~350–450 words without a new slug line

=== META ===
${JSON.stringify({ idea, genre, logline: meta.logline, synopsis: meta.synopsis, themes: meta.themes }, null, 2)}
`.trim();

    const { content: scriptText } = await callOpenAIText(writePrompt, {
      temperature: 0.82,
      max_tokens: 4096,
      model: MODEL_TEXT,
    });

    return {
      logline: meta.logline,
      synopsis: meta.synopsis,
      scriptText: scriptText.trim(),
      shortScript: meta.shortScript || [],
      themes: meta.themes || [],
    };
  }

  // --- PATH B: Feature scripts ---
  const outlineParsed = await getRobustOutline({
    idea,
    genre,
    targetPages,
    approxScenes,
    synopsisLength,
  });

  const shortScript: ShortScriptItem[] = outlineParsed.shortScript || [];
  const effectiveScenes = Math.max(1, shortScript.length || approxScenes);

  const chunkCount =
    targetPages <= 45 ? 4 :
    targetPages <= 70 ? 6 :
    targetPages <= 95 ? 8 :
    10;

  const safeChunkCount = Math.min(chunkCount, effectiveScenes);
  const pagesPerChunk = Math.ceil(targetPages / safeChunkCount);

  const minWords = Math.max(900, Math.round(pagesPerChunk * 210));
  const aimWords = Math.max(minWords, Math.round(pagesPerChunk * 235));
  const maxWords = Math.max(aimWords + 200, Math.round(pagesPerChunk * 255));

  const maxTokensPerChunk = clamp(Math.round(maxWords * 1.35), 4200, 12000);

  const chunkRanges = Array.from({ length: safeChunkCount }, (_, idx) => {
    const startScene = Math.floor(idx * (effectiveScenes / safeChunkCount)) + 1;
    const endScene = Math.min(Math.floor((idx + 1) * (effectiveScenes / safeChunkCount)), effectiveScenes);
    return { part: idx + 1, startScene, endScene };
  }).filter((r) => r.endScene >= r.startScene);

  const beatsMax = targetPages >= 60 ? 28 : 32;

  const chunkInputs = chunkRanges.map((r) => {
    const chunkScenes = shortScript.slice(r.startScene - 1, r.endScene);
    const beats = chunkScenes
      .slice(0, beatsMax)
      .map((s) => `#${s.sceneNumber} (Act ${s.act}) ${s.heading} — ${s.summary}`)
      .join("\n");
    return { ...r, beats: beats || "(No beats available for this chunk.)" };
  });

  const plans = await getChunkPlans({
    idea,
    genre,
    targetPages,
    outline: outlineParsed,
    chunks: chunkInputs,
  });

  type ChunkGenResult =
    | { ok: true; content: string }
    | { ok: false; content: string; error: unknown };

  const envConc = parseInt(process.env.SCRIPT_CHUNK_CONCURRENCY || "4", 10);
  const chunkConcurrency = clamp(Number.isFinite(envConc) ? envConc : 4, 1, 6);

  async function generateOneChunk(
    chunk: { part: number; startScene: number; endScene: number; beats: string },
    index: number,
    attempt: number
  ): Promise<ChunkGenResult> {
    await delay((index % chunkConcurrency) * 300);

    const isStart = index === 0;
    const plan = plans?.[index];

    const chunkPrompt = `
Write a continuous portion of a feature screenplay in **Fountain** format.

GLOBAL CONTEXT:
Genre: ${genre}
Logline: ${outlineParsed.logline}
Synopsis: ${outlineParsed.synopsis}
Themes: ${(outlineParsed.themes || []).slice(0, 6).join(", ")}

SCOPE:
- This is the portion covering scenes #${chunk.startScene} through #${chunk.endScene}.
- Length target: Aim for ~${aimWords} words (range ${minWords}–${maxWords}).
- EXPAND the beats into full scenes with rich dialogue and cinematic action.
- Do NOT summarize. Write the actual screenplay.

FORMAT RULES:
- ${isStart ? 'Include "FADE IN:" exactly once at the very start.' : 'Do NOT include "FADE IN:". Start with the first scene heading.'}
- Use slug lines frequently.
- Action in present tense.
- No meta labels like "PART ${chunk.part}".

${plan ? `CONTINUITY CONSTRAINTS:
START STATE: ${plan.startState}
END STATE: ${plan.endState}
MUST INCLUDE: ${(plan.mustInclude || []).join(", ")}
MUST AVOID: ${(plan.mustAvoid || []).join(", ")}
` : ""}

BEATS TO EXPAND:
${chunk.beats}
`.trim();

    try {
      const temp = attempt >= 2 ? 0.78 : 0.85;

      const { content } = await callOpenAIText(chunkPrompt, {
        temperature: temp,
        max_tokens: maxTokensPerChunk,
        timeout_ms: DEFAULT_TEXT_CALL_TIMEOUT_MS,
        max_retries: 0,
        model: MODEL_TEXT,
      });

      const cleaned = (content || "").trim();
      if (!cleaned) throw new Error("Empty chunk content");
      return { ok: true, content: cleaned };
    } catch (error) {
      return { ok: false, content: "", error };
    }
  }

  const firstPass = await mapWithConcurrency(chunkInputs, chunkConcurrency, async (chunk, index) => {
    return generateOneChunk(chunk, index, 1);
  });

  const failedIdx = firstPass
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.ok)
    .map(({ i }) => i);

  if (failedIdx.length > 0) {
    await delay(900);

    const retryResults = await mapWithConcurrency(
      failedIdx,
      Math.max(1, Math.min(2, chunkConcurrency)),
      async (idx) => {
        await delay(idx * 250);
        return { idx, res: await generateOneChunk(chunkInputs[idx], idx, 2) };
      }
    );

    for (const { idx, res } of retryResults) {
      firstPass[idx] = res;
    }
  }

  const stitchedChunks = firstPass.map((r, idx) => {
    if (r.ok) return r.content;

    const chunk = chunkInputs[idx];
    const plan = plans?.[idx];
    const note = `
/*
NOTE: This section could not be generated due to a transient error.
Use the beats below to regenerate PART ${chunk.part} (Scenes ${chunk.startScene}–${chunk.endScene}):

${plan ? `START STATE: ${plan.startState}
END STATE: ${plan.endState}
MUST INCLUDE: ${(plan.mustInclude || []).join(", ")}
MUST AVOID: ${(plan.mustAvoid || []).join(", ")}\n\n` : ""}${chunk.beats}
*/
`.trim();

    return note;
  });

  const stitched = stitchedChunks.filter(Boolean).join("\n\n");
  const scriptFountain = stripExtraFadeIn(stitched);

  return {
    logline: outlineParsed.logline,
    synopsis: outlineParsed.synopsis,
    scriptText: scriptFountain.trim(),
    shortScript,
    themes: outlineParsed.themes,
  };
};

// ---------- Characters ----------

export const generateCharacters = async (script: string, genre: string) => {
  const prompt = `
Given this film script:
${script}

Generate detailed character profiles for ALL main and supporting characters in this ${genre} film.
Return JSON: { "characters": [...] } with the exact fields:
- name
- role
- description
- traits (array)
- skinColor
- hairColor
- clothingColor
- mood
- visualDescription
- imageUrl (empty string)
`.trim();

  const res = await callOpenAIJsonSchema<{ characters: Character[] }>(prompt, buildCharactersSchema(), {
    temperature: 0.35,
    max_tokens: 2200,
    request_tag: "characters",
    schema_name: "Characters",
    model: MODEL_JSON,
    max_retries: 0,
  });

  return { characters: res.data?.characters || [] };
};

// ---------- Storyboard ----------

export const generateStoryboard = async ({
  movieIdea,
  movieGenre,
  script,
  scriptLength,
  characters,
}: {
  movieIdea: string;
  movieGenre: string;
  script: string;
  scriptLength: string;
  characters: Character[];
}) => {
  const duration = parseLengthToMinutes(scriptLength);
  const numFrames = duration <= 5 ? 8 : duration <= 15 ? 15 : duration <= 30 ? 25 : duration <= 60 ? 40 : 80;
  const coveragePerFrame = duration > 15 ? 3 : 2;

  const prompt = `
Generate a detailed storyboard for this ${movieGenre} film idea: ${movieIdea}

Full Script (trimmed):
${tail(script, 18000)}

Characters:
${JSON.stringify(characters).slice(0, 12000)}

Specifications:
- Target about ${numFrames} main frames (we will normalize if needed)
- Each main frame should include ~${coveragePerFrame} coverage shots
- For each frame/shot include:
  scene, shotNumber, description, cameraAngle, cameraMovement, lens, lighting, duration, dialogue, soundEffects, notes, imagePrompt, imageUrl (empty)
- Always fill imagePrompt. Leave imageUrl empty.

Return JSON with key "storyboard" containing array of main frames, each optionally having coverageShots array.
`.trim();

  const res = await callOpenAIJsonSchema<{ storyboard: StoryboardFrame[] }>(prompt, buildStoryboardSchema(), {
    temperature: 0.4,
    max_tokens: 4500,
    request_tag: "storyboard",
    schema_name: "Storyboard",
    model: MODEL_JSON,
    max_retries: 0,
  });

  let frames = res.data?.storyboard || [];
  frames = Array.isArray(frames) ? frames : [];

  // Normalize: ensure imageUrl exists, coverageShots exists
  frames = frames.map((f, idx) => ({
    ...f,
    shotNumber: String(f.shotNumber || `${idx + 1}`),
    imagePrompt: String(f.imagePrompt || f.description || "Cinematic storyboard frame."),
    imageUrl: "",
    coverageShots: Array.isArray(f.coverageShots)
      ? f.coverageShots.map((c, j) => ({
          ...c,
          shotNumber: String(c.shotNumber || `${idx + 1}.${j + 1}`),
          imagePrompt: String(c.imagePrompt || c.description || "Coverage storyboard shot."),
          imageUrl: "",
        }))
      : [],
  }));

  return frames;
};

// ---------- Concept ----------

export const generateConcept = async (script: string, genre: string) => {
  const prompt = `
Based on this ${genre} film script:
${tail(script, 20000)}

Generate a visual concept including:
- concept object with visualStyle, colorPalette, cameraTechniques, lightingApproach, thematicSymbolism, productionValues
- visualReferences: array of 3-5 objects with description and imageUrl (reference links if available)

Return JSON.
`.trim();

  const res = await callOpenAIJsonSchema<{ concept: any; visualReferences: any[] }>(prompt, buildConceptSchema(), {
    temperature: 0.5,
    max_tokens: 2200,
    request_tag: "concept",
    schema_name: "Concept",
    model: MODEL_JSON,
    max_retries: 0,
  });

  return {
    concept: res.data?.concept || {},
    visualReferences: res.data?.visualReferences || [],
  };
};

// ---------- Budget ----------

export const generateBudget = async (genre: string, length: string) => {
  const duration = parseLengthToMinutes(length);
  const baseBudget =
    duration <= 5 ? 5000 :
    duration <= 15 ? 15000 :
    duration <= 30 ? 50000 :
    duration <= 60 ? 100000 :
    duration <= 120 ? 200000 : 500000;

  const genreMultiplier = /sci[- ]?fi|action/i.test(genre) ? 1.5 : 1;
  const total = Math.round(baseBudget * genreMultiplier);

  const prompt = `
Generate a detailed film budget breakdown for a ${genre} film of ${length} length.
Total estimated budget: $${total}

Return JSON:
{
  "categories": [
    {
      "name": "...",
      "amount": number,
      "percentage": number,
      "items": [{"name":"...","cost": number}],
      "tips": ["..."],
      "alternatives": ["..."]
    }
  ]
}

Rules:
- category amounts must roughly sum to total budget
- percentages should total ~100
- be realistic for indie film production
`.trim();

  const res = await callOpenAIJsonSchema<{ categories: any[] }>(prompt, buildBudgetSchema(), {
    temperature: 0.25,
    max_tokens: 2600,
    request_tag: "budget",
    schema_name: "Budget",
    model: MODEL_JSON,
    max_retries: 0,
  });

  return res.data || { categories: [] };
};

// ---------- Schedule ----------

export const generateSchedule = async (script: string, length: string) => {
  const prompt = `
Given this film script:
${tail(script, 20000)}

Generate a shooting schedule for a film of length ${length}.
Return JSON:
{
  "schedule": [
    {
      "day": "Day 1",
      "activities": ["..."],
      "duration": "...",
      "location": "...",
      "crew": ["..."]
    }
  ]
}
`.trim();

  const res = await callOpenAIJsonSchema<{ schedule: any[] }>(prompt, buildScheduleSchema(), {
    temperature: 0.3,
    max_tokens: 2200,
    request_tag: "schedule",
    schema_name: "Schedule",
    model: MODEL_JSON,
    max_retries: 0,
  });

  return { schedule: res.data?.schedule || [] };
};

// ---------- Locations ----------

export const generateLocations = async (script: string, genre: string) => {
  const fallbackScript = `
A ${genre || "generic"} film featuring a protagonist navigating several dramatic locations:
- An abandoned warehouse full of shadows and secrets.
- Rainy neon-lit city streets at night.
- A dramatic rooftop showdown above a glowing skyline.
`.trim();

  const usedScript = script && script.trim().length > 0 ? script : fallbackScript;

  const prompt = `
You are a professional film location scout.

Analyze the following film script and extract ALL distinct filming locations based on scene headings and descriptions.

SCRIPT:
"""START_SCRIPT"""
${tail(usedScript, 22000)}
"""END_SCRIPT"""

Return JSON:
{
  "locations": [
    {
      "name": "...",
      "type": "Interior|Exterior",
      "description": "...",
      "mood": "...",
      "colorPalette": "...",
      "propsOrFeatures": ["..."],
      "scenes": ["..."],
      "rating": 1-5,
      "lowBudgetTips": "...",
      "highBudgetOpportunities": "..."
    }
  ]
}

Rules:
- Use only actual location names from scene headings (do not invent generic names).
- Never leave any field blank.
`.trim();

  const res = await callOpenAIJsonSchema<{ locations: any[] }>(prompt, buildLocationsSchema(), {
    temperature: 0.35,
    max_tokens: 3200,
    request_tag: "locations",
    schema_name: "Locations",
    model: MODEL_JSON,
    max_retries: 0,
  });

  return { locations: res.data?.locations || [] };
};

// ---------- Sound Assets ----------

export const generateSoundAssets = async (script: string, genre: string) => {
  const duration = parseInt(script.match(/\d+/)?.[0] || "5", 10);
  const numAssets = duration <= 15 ? 5 : duration <= 60 ? 8 : 15;

  const prompt = `
Given this film script:
${tail(script, 22000)}

Generate exactly ${numAssets} sound assets for a ${genre} film.

Return JSON:
{
  "soundAssets": [
    {
      "name": "...",
      "type": "music|sfx|dialogue|ambient",
      "duration": "MM:SS",
      "description": "at least 50 words, vivid and specific for AI audio generation",
      "scenes": ["..."],
      "audioUrl": ""
    }
  ]
}

Rules:
- duration must be at least 00:10
- audioUrl must be an empty string
`.trim();

  const res = await callOpenAIJsonSchema<{ soundAssets: any[] }>(prompt, buildSoundAssetsSchema(), {
    temperature: 0.35,
    max_tokens: 2600,
    request_tag: "sound",
    schema_name: "SoundAssets",
    model: MODEL_JSON,
    max_retries: 0,
  });

  let soundAssets: any[] = res.data?.soundAssets || [];

  const minDuration = duration >= 60 ? "00:30" : "00:10";
  soundAssets = soundAssets.map((asset) => {
    const [mins, secs] = String(asset.duration || "00:10")
      .split(":")
      .map((n: string) => parseInt(n, 10) || 0);
    const totalSecs = (mins || 0) * 60 + (secs || 0);
    const adjustedDuration = totalSecs >= 10 ? asset.duration : minDuration;
    return { ...asset, duration: adjustedDuration, audioUrl: "" };
  });

  return { soundAssets };
};
