// C:\Users\vizir\VizirPro\lib\generators.ts
import OpenAI from "openai";
/**
 * ✅ Build-safe OpenAI init (prevents Vercel build crash when env vars aren't present at build time)
 * - DO NOT instantiate OpenAI at module load.
 * - Lazily init at runtime when the API route is called.
 * - Also guard against accidental client-side import.
 *
 * ✅ IMPORTANT MODEL NOTE:
 * This file uses `openai.chat.completions.create(...)`.
 * Some accounts/projects have access restrictions per model alias (ex: `gpt-5-chat-latest`).
 * We therefore:
 * - Try your env model name as-is FIRST
 * - Then try the corresponding `*-chat-latest` alias (for gpt-5 / gpt-5.2)
 * - Then fall back to a safe model you likely have (default: gpt-4o-mini)
 *
 * ✅ IMPORTANT PARAM NOTE (FIXED):
 * Chat Completions normally uses `max_tokens`.
 * Some providers/models reject `max_tokens` and require `max_completion_tokens`.
 * We now:
 * - Send `max_tokens` by default
 * - If rejected, retry once with `max_completion_tokens`
 * - If that is rejected, retry once with `max_tokens`
 *
 * ✅ Temperature sending is OFF by default
 * To enable it:
 * OPENAI_SEND_TEMPERATURE=1
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
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  // ✅ Kill hidden retry spirals on serverless by default (override via env if desired)
  const maxRetries = parseInt(process.env.OPENAI_CLIENT_MAX_RETRIES || "0", 10);
  const timeout = parseInt(process.env.OPENAI_CLIENT_TIMEOUT_MS || "180000", 10); // 3 min client timeout
  _openai = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    maxRetries: Number.isFinite(maxRetries) ? maxRetries : 0,
    timeout: Number.isFinite(timeout) ? timeout : 180000,
  });
  return _openai;
}
// ✅ Model defaults (set these in Vercel env vars for Production + Preview)
const MODEL_TEXT_RAW = (process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini").trim(); // screenplay text
const MODEL_JSON_RAW = (process.env.OPENAI_MODEL_JSON || "gpt-4o-mini").trim(); // structured JSON outputs
// ✅ Fallback models (used only if your chosen model is blocked/unavailable)
const FALLBACK_MODEL_TEXT = (process.env.OPENAI_FALLBACK_MODEL_TEXT || "gpt-4o-mini").trim();
const FALLBACK_MODEL_JSON = (process.env.OPENAI_FALLBACK_MODEL_JSON || "gpt-4o-mini").trim();
// ✅ Temperature sending is OFF by default
const SEND_TEMPERATURE = process.env.OPENAI_SEND_TEMPERATURE === "1";
// ✅ Debug + timeout guards
const DEBUG_OUTLINE = process.env.DEBUG_OUTLINE === "1";
const OUTLINE_USE_JSON_SCHEMA = process.env.OUTLINE_USE_JSON_SCHEMA !== "0"; // set to "0" to force json_object for outline calls
const OUTLINE_TOTAL_BUDGET_MS = parseInt(process.env.OUTLINE_TOTAL_BUDGET_MS || "120000", 10); // 2 minutes
const OUTLINE_CALL_TIMEOUT_MS = parseInt(process.env.OUTLINE_CALL_TIMEOUT_MS || "45000", 10); // 45 seconds per outline call
const DEFAULT_JSON_CALL_TIMEOUT_MS = parseInt(process.env.DEFAULT_JSON_CALL_TIMEOUT_MS || "60000", 10); // 60 seconds
const DEFAULT_TEXT_CALL_TIMEOUT_MS = parseInt(process.env.DEFAULT_TEXT_CALL_TIMEOUT_MS || "120000", 10); // 120 seconds
// Optional: cap output tokens to avoid model hard-limit errors (override if you know your model supports more)
const MAX_COMPLETION_TOKENS_CAP = parseInt(process.env.OPENAI_MAX_COMPLETION_TOKENS_CAP || "16000", 10);
// ✅ Page/words calibration (lets you align “page count” with your exporter)
// Default is classic rough screenplay math. If your export renders fewer pages, LOWER this number (e.g., 180).
const SCRIPT_WORDS_PER_PAGE = clampInt(parseInt(process.env.SCRIPT_WORDS_PER_PAGE || "180", 10), 120, 320);
// Feature writing enforcement (more aggressive defaults)
const FEATURE_CONTINUE_PASSES = clampInt(parseInt(process.env.FEATURE_CONTINUE_PASSES || "4", 10), 0, 10);
const FEATURE_MIN_WORD_RATIO = clampFloat(parseFloat(process.env.FEATURE_MIN_WORD_RATIO || "0.96"), 0.5, 0.995);
const FEATURE_CONTINUE_TAIL_CHARS = clampInt(parseInt(process.env.FEATURE_CONTINUE_TAIL_CHARS || "3500", 10), 800, 8000);
const FEATURE_DEBUG_CHUNKS = process.env.FEATURE_DEBUG_CHUNKS === "1";
// Optional: final “top-off” passes if the stitched script is still under minimum pages
const FEATURE_FINAL_TOP_OFF_PASSES = clampInt(parseInt(process.env.FEATURE_FINAL_TOP_OFF_PASSES || "5", 10), 0, 10);
// ---------- Helpers for OpenAI calls ----------
type ChatOptions = {
  model?: string;
  // NOTE: we only SEND temperature if OPENAI_SEND_TEMPERATURE=1
  temperature?: number;
  /**
   * ✅ Token controls:
   * For Chat Completions, `max_tokens` is the standard.
   * Some providers/models require `max_completion_tokens` instead.
   * We send max_tokens by default, and auto-retry if unsupported.
   */
  max_tokens?: number;
  max_completion_tokens?: number;
  // Supported params (optional)
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string | string[];
  seed?: number;
  // app-only extras (NEVER forwarded to OpenAI)
  schema_name?: string; // json_schema name
  request_tag?: string; // debug logging tag
  timeout_ms?: number; // per-request timeout
  debug?: boolean; // verbose logs
  force_json_object?: boolean; // force json_object even if schema enabled
};
function uniq(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const s = String(v || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
function toChatAliasIfKnown(model: string) {
  const m = String(model || "").trim();
  if (!m) return "";
  // Already a chat alias or explicit latest alias → keep as-is
  if (/chat/i.test(m) || /-latest$/i.test(m)) return m;
  // Common base model names → map to chat alias candidate
  if (/^gpt-5\.2$/i.test(m)) return "gpt-5.2-chat-latest";
  if (/^gpt-5$/i.test(m)) return "gpt-5-chat-latest";
  // Otherwise: no known alias mapping
  return "";
}
function modelCandidatesForChat(rawModel: string, fallbackModel: string) {
  const m = String(rawModel || "").trim();
  const alias = toChatAliasIfKnown(m);
  return uniq([m, alias, fallbackModel]);
}
/**
 * ✅ Robust error info extraction across:
 * - OpenAI SDK (v4/v5) error shapes
 * - fetch/undici errors
 * - axios-like response wrappers
 */
function extractOpenAIErrorInfo(err: any): {
  status: number;
  code: string;
  type: string;
  param: string;
  message: string;
} {
  const statusRaw =
    err?.status ??
    err?.response?.status ??
    err?.response?.statusCode ??
    err?.error?.status ??
    err?.error?.response?.status ??
    0;
  const status = Number(statusRaw) || 0;
  // Prefer the deepest “OpenAI-style” error fields when present
  const code =
    String(
      err?.code ??
        err?.error?.code ??
        err?.error?.error?.code ??
        err?.response?.data?.error?.code ??
        err?.response?.body?.error?.code ??
        ""
    ) || "";
  const type =
    String(
      err?.type ??
        err?.error?.type ??
        err?.error?.error?.type ??
        err?.response?.data?.error?.type ??
        err?.response?.body?.error?.type ??
        ""
    ) || "";
  const param =
    String(
      err?.param ??
        err?.error?.param ??
        err?.error?.error?.param ??
        err?.response?.data?.error?.param ??
        err?.response?.body?.error?.param ??
        ""
    ) || "";
  const message =
    String(
      err?.message ??
        err?.error?.message ??
        err?.error?.error?.message ??
        err?.response?.data?.error?.message ??
        err?.response?.body?.error?.message ??
        err?.response?.data?.message ??
        err?.response?.body?.message ??
        ""
    ) || "";
  return { status, code, type, param, message };
}
function isParamUnsupported(err: any, paramName: string) {
  const info = extractOpenAIErrorInfo(err);
  const msg = String(info.message || "").toLowerCase();
  const p = String(info.param || "").toLowerCase();
  const want = String(paramName || "").toLowerCase();
  if (p === want) return true;
  // common wording
  if (msg.includes("unsupported parameter") && msg.includes(want)) return true;
  if (msg.includes("unknown parameter") && msg.includes(want)) return true;
  if (msg.includes("unexpected parameter") && msg.includes(want)) return true;
  if (msg.includes("invalid parameter") && msg.includes(want)) return true;
  return false;
}
/**
 * ✅ PATCH: replace the old isModelAccessOrNotFound helper
 */
function isModelAccessOrNotFound(err: any) {
  const info = extractOpenAIErrorInfo(err);
  const msg = String(info.message || "").toLowerCase();
  const code = String(info.code || "").toLowerCase();
  const type = String(info.type || "").toLowerCase();
  const status = Number(info.status || 0);
  const name = String(err?.name || "").toLowerCase();
  if (status === 403 || status === 404) return true;
  if (name.includes("notfound") || name.includes("permission") || name.includes("forbidden")) return true;
  if (code === "model_not_found" || code === "not_found") return true;
  if (type === "not_found_error" || type === "permission_denied" || type === "insufficient_permissions") return true;
  if (msg.includes("does not have access to model")) return true;
  if (msg.includes("model_not_found")) return true;
  if (msg.includes("no such model")) return true;
  if (msg.includes("the model") && msg.includes("does not exist")) return true;
  if (msg.includes("not found") && msg.includes("model")) return true;
  return false;
}
/**
 * ✅ PATCH: replace the old isTemperatureUnsupported helper
 */
function isTemperatureUnsupported(err: any) {
  const info = extractOpenAIErrorInfo(err);
  const msg = String(info.message || "").toLowerCase();
  const param = String(info.param || "").toLowerCase();
  const status = Number(info.status || 0);
  const mentionsTemp = param === "temperature" || msg.includes("temperature");
  if (!mentionsTemp) return false;
  if (msg.includes("unsupported value") && msg.includes("temperature")) return true;
  if (msg.includes("unsupported") && msg.includes("temperature")) return true;
  if (msg.includes("invalid") && msg.includes("temperature")) return true;
  if (msg.includes("only the default") && msg.includes("temperature")) return true;
  if (msg.includes("default (1)") && msg.includes("temperature")) return true;
  if (status === 400 && mentionsTemp && (msg.includes("supported") || msg.includes("allowed"))) return true;
  return false;
}
/**
 * ✅ IMPORTANT FIX:
 * - Default to `max_tokens` for chat.completions
 * - Cap it to avoid provider hard limits
 * - createChatCompletionWithFallback will swap to max_completion_tokens if needed
 */
function pickCompletionParams(options: ChatOptions) {
  const out: any = {};
  // ✅ Temperature is OFF by default
  if (SEND_TEMPERATURE && typeof options.temperature === "number") {
    out.temperature = options.temperature;
  }
  // Token target
  const raw =
    typeof options.max_tokens === "number"
      ? options.max_tokens
      : typeof options.max_completion_tokens === "number"
      ? options.max_completion_tokens
      : undefined;
  if (typeof raw === "number") {
    const cap = Number.isFinite(MAX_COMPLETION_TOKENS_CAP) ? MAX_COMPLETION_TOKENS_CAP : 12000;
    const v = Math.max(64, Math.min(Math.trunc(raw), cap));
    out.max_tokens = v; // ✅ default for chat.completions
  }
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
  if (t.endsWith("\\")) return true;
  return false;
}
/**
 * ✅ safer JSON parse
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
    const a = str.indexOf("[");
    const b = str.lastIndexOf("]");
    if (a >= 0 && b > a) {
      const candidate = str.slice(a, b + 1).trim();
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
function swapToMaxCompletionTokens(payload: any) {
  if (!payload) return payload;
  const p = { ...payload };
  const v = p.max_tokens;
  if (typeof v === "number") {
    delete p.max_tokens;
    p.max_completion_tokens = v;
  }
  return p;
}
function swapToMaxTokens(payload: any) {
  if (!payload) return payload;
  const p = { ...payload };
  const v = p.max_completion_tokens;
  if (typeof v === "number") {
    delete p.max_completion_tokens;
    p.max_tokens = v;
  }
  return p;
}
/**
 * ✅ Core wrapper:
 * - tries model candidates (env model → chat alias → fallback)
 * - retries for:
 * - temperature unsupported
 * - max_tokens vs max_completion_tokens incompatibilities
 */
async function createChatCompletionWithFallback(
  payload: any,
  timeout: number,
  candidates: string[],
  tag: string
) {
  const openai = getOpenAI();
  let lastErr: any = null;
  for (const model of candidates) {
    try {
      const basePayload = { ...payload, model };
      // 1) Try as-is
      try {
        return await openai.chat.completions.create(basePayload, { timeout });
      } catch (err1: any) {
        // 2) If temperature rejected, retry same model once without temperature (and often top_p too)
        if (isTemperatureUnsupported(err1) && basePayload.temperature !== undefined) {
          const retryPayload = { ...basePayload };
          delete retryPayload.temperature;
          delete retryPayload.top_p;
          try {
            return await openai.chat.completions.create(retryPayload, { timeout });
          } catch (err2: any) {
            err1 = err2;
          }
        }
        // 3) If token param rejected, swap and retry
        if (isParamUnsupported(err1, "max_tokens") && basePayload.max_tokens !== undefined) {
          const retryPayload = swapToMaxCompletionTokens(basePayload);
          return await openai.chat.completions.create(retryPayload, { timeout });
        }
        if (
          isParamUnsupported(err1, "max_completion_tokens") &&
          basePayload.max_completion_tokens !== undefined
        ) {
          const retryPayload = swapToMaxTokens(basePayload);
          return await openai.chat.completions.create(retryPayload, { timeout });
        }
        throw err1;
      }
    } catch (err: any) {
      lastErr = err;
      if (isModelAccessOrNotFound(err)) {
        if (DEBUG_OUTLINE) {
          console.log(`[${tag}] model failed: ${model} → trying next. msg=${String(err?.message || "")}`);
        }
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error(`[${tag}] all model candidates failed`);
}
async function callOpenAI(
  prompt: string,
  options: ChatOptions = {}
): Promise<{ content: string; finish_reason: string }> {
  const candidates = modelCandidatesForChat(options.model || MODEL_JSON_RAW, FALLBACK_MODEL_JSON);
  const timeout = typeof options.timeout_ms === "number" ? options.timeout_ms : DEFAULT_JSON_CALL_TIMEOUT_MS;
  const completion = await createChatCompletionWithFallback(
    {
      messages: [
        {
          role: "system",
          content: "You are an expert film development AI. Return ONLY valid JSON. No markdown, no commentary.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      ...pickCompletionParams(options),
    },
    timeout,
    candidates,
    options.request_tag || "json_object"
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
  const candidates = modelCandidatesForChat(options.model || MODEL_TEXT_RAW, FALLBACK_MODEL_TEXT);
  const timeout = typeof options.timeout_ms === "number" ? options.timeout_ms : DEFAULT_TEXT_CALL_TIMEOUT_MS;
  const completion = await createChatCompletionWithFallback(
    {
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
        temperature: typeof options.temperature === "number" ? options.temperature : 1,
        max_tokens: typeof options.max_tokens === "number" ? options.max_tokens : 4096,
        max_completion_tokens:
          typeof options.max_completion_tokens === "number" ? options.max_completion_tokens : undefined,
      }),
    },
    timeout,
    candidates,
    options.request_tag || "text"
  );
  const choice = completion.choices[0];
  return {
    content: (extractMsgContent(choice) ?? "").trim(),
    finish_reason: choice.finish_reason || "stop",
  };
}
/**
 * ✅ Structured Outputs helper for schema-locked JSON.
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
  const messages = [
    {
      role: "system" as const,
      content: "Return ONLY valid JSON that conforms exactly to the provided schema. No extra keys. No markdown.",
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
  const wantSchema = OUTLINE_USE_JSON_SCHEMA && options.force_json_object !== true;
  const candidates = modelCandidatesForChat(options.model || MODEL_JSON_RAW, FALLBACK_MODEL_JSON);
  if (wantSchema) {
    try {
      const completion = await createChatCompletionWithFallback(
        {
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
            max_tokens: typeof options.max_tokens === "number" ? options.max_tokens : 4500,
            max_completion_tokens:
              typeof options.max_completion_tokens === "number" ? options.max_completion_tokens : undefined,
          }),
        },
        timeout,
        candidates,
        tag
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
      return { data, content: content.trim(), finish_reason: finish, used_schema: true, meta };
    } catch (err) {
      if (debug) console.log(`[${tag}] schema call threw; falling back to json_object.`, err);
    }
  }
  const { content, finish_reason } = await callOpenAI(prompt, {
    ...options,
    temperature: typeof options.temperature === "number" ? options.temperature : 0.3,
    max_tokens: typeof options.max_tokens === "number" ? options.max_tokens : 4500,
    timeout_ms: timeout,
    request_tag: tag,
    model: options.model,
  });
  if (finish_reason === "length" || looksTruncatedJson(content)) {
    if (debug) console.log(`[${tag}] fallback detected truncation (finish=length or incomplete JSON).`);
    return {
      data: null,
      content: content.trim(),
      finish_reason,
      used_schema: false,
      meta: { content_len: content.length, usage: null, finish_reason },
    };
  }
  const data = safeParse<T>(content, `${tag}-json_object-fallback`);
  const meta = { content_len: content.length, usage: null, finish_reason };
  if (debug) {
    console.log(`[${tag}] used_schema=false finish=${finish_reason} chars=${content.length} usage=n/a`);
  }
  return { data, content: content.trim(), finish_reason, used_schema: false, meta };
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
  shotSize?: string;        // e.g. "ECU", "CU", "MCU", "MS", "MLS", "LS", "ELS", "OS", "POV", "2-Shot"
  cameraAngle?: string;     // e.g. "Eye Level", "Low Angle", "High Angle", "Dutch Angle", "Bird's Eye", "Worm's Eye"
  cameraMovement?: string;  // e.g. "Static", "Pan L→R", "Tilt Up", "Dolly In", "Tracking", "Crane Up", "Handheld", "Steadicam"
  lens?: string;            // e.g. "24mm Wide", "50mm Standard", "85mm Portrait", "135mm Telephoto"
  lighting?: string;        // e.g. "Key + Fill (Rembrandt)", "Silhouette", "Practical Only", "High Key", "Low Key"
  composition?: string;     // e.g. "Rule of Thirds — subject right", "Center Frame", "Leading Lines", "Frame within Frame"
  duration?: string;        // e.g. "3s", "5s"
  dialogue?: string;
  soundEffects?: string;
  actionNotes?: string;     // blocking & action choreography
  transition?: string;      // e.g. "CUT TO:", "DISSOLVE TO:", "SMASH CUT:", "MATCH CUT:"
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
function clampInt(n: number, min: number, max: number) {
  const v = Number.isFinite(n) ? Math.trunc(n) : min;
  return clamp(v, min, max);
}
function clampFloat(n: number, min: number, max: number) {
  const v = Number.isFinite(n) ? n : min;
  return clamp(v, min, max);
}
function tail(text: string, maxChars = 4000) {
  if (!text) return "";
  return text.length > maxChars ? text.slice(-maxChars) : text;
}
function countWords(text: string) {
  const t = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}
function estimatePagesFromWords(words: number, wordsPerPage = SCRIPT_WORDS_PER_PAGE) {
  if (!wordsPerPage || wordsPerPage <= 0) return 0;
  return Math.max(1, Math.round(words / wordsPerPage));
}
function stripChunkMarkers(text: string) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*\[\[CHUNK_END\]\]\s*$/gim, "")
    .replace(/^\s*\[\[CHUNK_CONTINUE\]\]\s*$/gim, "")
    .trim();
}
function normalizeNewlines(text: string) {
  return String(text || "").replace(/\r\n/g, "\n");
}
function lastNonEmptyLine(text: string) {
  const lines = normalizeNewlines(text).split("\n").map((l) => l.trimEnd());
  for (let i = lines.length - 1; i >= 0; i--) {
    const v = (lines[i] || "").trim();
    if (v) return v;
  }
  return "";
}
function extractLastSlugline(text: string) {
  const lines = normalizeNewlines(text).split("\n");
  const re = /^\s*(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.)\s+/i;
  for (let i = lines.length - 1; i >= 0; i--) {
    const ln = (lines[i] || "").trim();
    if (re.test(ln)) return ln;
  }
  return "";
}
function stripTheEndLines(text: string) {
  return String(text || "")
    .replace(/^\s*THE END\.?\s*$/gim, "")
    .trim();
}
/**
 * Removes repeated overlap when continuation starts by reprinting the tail.
 */
function removeOverlap(prev: string, next: string, maxScan = 1600) {
  const a = normalizeNewlines(prev);
  const b = normalizeNewlines(next);
  if (!a || !b) return b;
  const aTail = a.slice(Math.max(0, a.length - maxScan));
  const maxK = Math.min(aTail.length, b.length);
  for (let k = maxK; k >= 80; k--) {
    const suffix = aTail.slice(aTail.length - k);
    if (b.startsWith(suffix)) {
      return b.slice(k).trimStart();
    }
  }
  const lastLine = lastNonEmptyLine(a);
  if (lastLine && b.startsWith(lastLine)) {
    return b.slice(lastLine.length).trimStart();
  }
  return b;
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
 * ✅ Safer: only removes duplicate FADE IN lines (line-anchored)
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
  const mainShotSchema = {
    type: "object",
    additionalProperties: false,
    required: ["scene", "shotNumber", "description", "imagePrompt", "imageUrl"],
    properties: {
      scene: { type: "string" },
      shotNumber: { type: "string" },
      description: { type: "string" },
      shotSize: { type: "string" },
      cameraAngle: { type: "string" },
      cameraMovement: { type: "string" },
      lens: { type: "string" },
      lighting: { type: "string" },
      composition: { type: "string" },
      duration: { type: "string" },
      dialogue: { type: "string" },
      soundEffects: { type: "string" },
      actionNotes: { type: "string" },
      transition: { type: "string" },
      notes: { type: "string" },
      imagePrompt: { type: "string" },
      imageUrl: { type: "string" },
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
        maxItems: 80,
        items: mainShotSchema,
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
  });
  return repaired.data;
}
/**
 * ✅ Act-splitting scenes (3 small calls) to prevent huge JSON truncation.
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
    model: MODEL_JSON_RAW,
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
  } else if (duration <= 45) {
    structureGuide = "A featurette. Streamlined plot, limited locations, focus on one main conflict.";
    numActs = 3;
    numCharacters = 5;
    synopsisLength = "350 words";
  } else if (duration <= 75) {
    structureGuide =
      "A feature film (45-75 pages). Strong three-act structure with subplots, character arcs, and escalating conflict. No filler scenes.";
    numActs = 3;
    numCharacters = 6;
    synopsisLength = "500 words";
  } else if (duration <= 100) {
    structureGuide =
      "A standard feature film (75-100 pages). Tight pacing, no filler scenes, strong three-act structure with rich subplots, character arcs, and a satisfying resolution.";
    numActs = 3;
    numCharacters = 7;
    synopsisLength = "500 words";
  } else {
    structureGuide = "An epic feature (100+ pages). Complex subplots, ensemble cast, extended character development, multiple story threads weaving together toward a powerful climax.";
    numActs = 3;
    numCharacters = 8;
    synopsisLength = "700 words";
  }
  const basePrompt = `
Generate a professional screenplay for a ${genre} film based on this idea:
${idea}
Specifications:
- Title: Create a catchy title
- Length: Aim for ${targetPages} pages total (1 page ≈ 1 minute, ~${SCRIPT_WORDS_PER_PAGE} words per page)
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
  "synopsis": "...",
  "themes": ["..."],
  "shortScript": [{"scene":"...","description":"...","dialogue":"..."}]
}
Constraints:
- synopsis should be about ${synopsisLength}.
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
      model: MODEL_JSON_RAW,
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
Write a screenplay in Fountain format of ~${targetPages} pages (1 page ≈ ~${SCRIPT_WORDS_PER_PAGE} words).
Start with FADE IN: and include the opening scene heading.
Output screenplay text ONLY. No JSON. No commentary.
Enforcement:
- Use slug lines frequently (INT./EXT.)
- Never go ~350–450 words without a new slug line
=== META ===
${JSON.stringify({ idea, genre, logline: meta.logline, synopsis: meta.synopsis, themes: meta.themes }, null, 2)}
`.trim();
    // Scale token budget: 1-5 min needs ~6k, 10-15 min needs up to ~10k
    const shortMaxTokens = duration <= 5 ? 6000 : duration <= 10 ? 8000 : 10000;
    const { content: scriptText } = await callOpenAIText(writePrompt, {
      temperature: 1,
      max_tokens: shortMaxTokens,
      model: MODEL_TEXT_RAW,
      request_tag: "short-script",
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
    targetPages <= 30 ? 3 :
    targetPages <= 45 ? 4 :
    targetPages <= 70 ? 6 :
    targetPages <= 90 ? 8 :
    targetPages <= 110 ? 10 :
    12;
  const safeChunkCount = Math.min(chunkCount, effectiveScenes);
  const pagesPerChunk = Math.ceil(targetPages / safeChunkCount);
  // Calibrated words-per-page math — higher multipliers to ensure sufficient length
  const MIN_WPP = Math.max(180, Math.round(SCRIPT_WORDS_PER_PAGE * 1.15));
  const AIM_WPP = Math.max(MIN_WPP, Math.round(SCRIPT_WORDS_PER_PAGE * 1.35));
  const MAX_WPP = Math.max(AIM_WPP + 30, Math.round(SCRIPT_WORDS_PER_PAGE * 1.6));
  const minWords = Math.max(1600, Math.round(pagesPerChunk * MIN_WPP));
  const aimWords = Math.max(minWords, Math.round(pagesPerChunk * AIM_WPP));
  const maxWords = Math.max(aimWords + 300, Math.round(pagesPerChunk * MAX_WPP));
  // Token budget (words→tokens approx) — generous to avoid truncation
  const maxTokensPerChunk = clamp(Math.round(maxWords * 2.5), 6000, 16000);
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
  const envConc = parseInt(process.env.SCRIPT_CHUNK_CONCURRENCY || "2", 10);
  const chunkConcurrency = clamp(Number.isFinite(envConc) ? envConc : 2, 1, 6);
  function logChunk(tag: string, data: any) {
    if (FEATURE_DEBUG_CHUNKS) console.log(`[feature-chunk] ${tag}`, data);
  }
  async function generateOneChunk(
    chunk: { part: number; startScene: number; endScene: number; beats: string },
    index: number,
    attempt: number
  ): Promise<ChunkGenResult> {
    await delay((index % chunkConcurrency) * 300);
    const isStart = index === 0;
    const isFinal = index === chunkInputs.length - 1;
    const plan = plans?.[index];
    const strictFeature = targetPages >= 30; // ✅ enforce real length for all medium+ scripts
    const chunkPrompt = `
Write a continuous portion of a feature screenplay in **Fountain** format.
GLOBAL CONTEXT:
Genre: ${genre}
Logline: ${outlineParsed.logline}
Synopsis: ${outlineParsed.synopsis}
Themes: ${(outlineParsed.themes || []).slice(0, 6).join(", ")}
SCOPE:
- This portion covers scenes #${chunk.startScene} through #${chunk.endScene}.
- LENGTH REQUIREMENT: You MUST write at least ${minWords} words. Target ~${aimWords} words (max ~${maxWords}).
- CRITICAL: Do NOT print [[CHUNK_END]] until you have written AT LEAST ${minWords} words. Count carefully.
- Each scene must be FULLY WRITTEN with detailed action lines, complete dialogue exchanges, character blocking, and scene descriptions.
- Write EVERY line of dialogue. Write EVERY action beat. Do NOT summarize or abbreviate.
- Each scene should feel like 1-2 real screenplay pages with rich detail.
FORMAT RULES:
- ${isStart ? 'Include "FADE IN:" exactly once at the very start.' : 'Do NOT include "FADE IN:". Start with the first scene heading.'}
- Use proper slug lines (INT./EXT.) and write cinematic action + dialogue.
- No meta labels like "PART ${chunk.part}".
- ${isFinal ? "You MAY end with a satisfying final beat (but no meta text)." : "DO NOT conclude the overall story. DO NOT write THE END."}
CONTINUATION MARKER (IMPORTANT):
- At the END of your output, print this exact line on its own line:
[[CHUNK_END]]
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
      const first = await callOpenAIText(chunkPrompt, {
        temperature: 1,
        max_tokens: maxTokensPerChunk,
        timeout_ms: DEFAULT_TEXT_CALL_TIMEOUT_MS,
        model: MODEL_TEXT_RAW,
        request_tag: `feature-chunk-${chunk.part}-a${attempt}`,
      });
      let combined = normalizeNewlines(first.content || "").trim();
      if (!combined) throw new Error("Empty chunk content");
      if (!/^\s*\[\[CHUNK_END\]\]\s*$/im.test(combined)) {
        combined = `${combined}\n\n[[CHUNK_END]]\n`;
      }
      // ✅ enforce strict minimum for features
      const minTarget = strictFeature ? minWords : Math.round(minWords * FEATURE_MIN_WORD_RATIO);
      const extraPasses = strictFeature ? 2 : 0;
      const passLimit = FEATURE_CONTINUE_PASSES + extraPasses;
      let words = countWords(stripChunkMarkers(combined));
      logChunk(`part-${chunk.part}-initial`, {
        words,
        minTarget,
        minWords,
        aimWords,
        maxWords,
        startScene: chunk.startScene,
        endScene: chunk.endScene,
      });
      for (let pass = 1; pass <= passLimit; pass++) {
        if (words >= minTarget) break;
        const prevClean = stripChunkMarkers(combined);
        const tailText = tail(prevClean, FEATURE_CONTINUE_TAIL_CHARS);
        const lastLine = lastNonEmptyLine(prevClean);
        const lastSlug = extractLastSlugline(prevClean);
        const needMore = Math.max(0, minTarget - words);
        const addWordsTarget = clampInt(Math.round(Math.max(700, needMore * 1.15)), 700, Math.round(aimWords * 1.1));
        const continuePrompt = `
Continue the SAME screenplay portion in **Fountain** format.
CRITICAL RULES (no repetition):
- Continue immediately AFTER where the previous text ends.
- Do NOT repeat ANY text already written.
- Begin with the NEXT line of screenplay after the last line shown.
- Do NOT recap. Do NOT re-introduce characters as if new.
- If you're still in the same scene, continue that scene.
- If that scene naturally ends, move to the next scene (still within scenes #${chunk.startScene}–#${chunk.endScene}).
LENGTH (STRICT):
- Add at least ~${addWordsTarget} NEW words of screenplay text (dialogue + action).
- Do NOT print [[CHUNK_END]] until you have added ~${addWordsTarget} new words.
DO NOT:
- Do not output "FADE IN:".
- ${isFinal ? "Avoid meta text. No headings like PART." : "Do NOT conclude the overall story. Do NOT write THE END."}
Anchor (last slugline if any): ${lastSlug || "(none found)"}
Exact last line (do NOT repeat it): ${lastLine || "(none)"}
LAST_OUTPUT_TAIL (for continuity; do NOT copy it):
<<<
${tailText}
>>>
Beats reminder (do NOT repeat scenes already covered; continue forward):
${chunk.beats}
At the END of your continuation, print:
[[CHUNK_END]]
`.trim();
        const cont = await callOpenAIText(continuePrompt, {
          temperature: 1,
          max_tokens: maxTokensPerChunk,
          timeout_ms: DEFAULT_TEXT_CALL_TIMEOUT_MS,
          model: MODEL_TEXT_RAW,
          request_tag: `feature-chunk-${chunk.part}-continue-${pass}`,
        });
        let contText = normalizeNewlines(cont.content || "").trim();
        if (!contText) break;
        if (!/^\s*\[\[CHUNK_END\]\]\s*$/im.test(contText)) {
          contText = `${contText}\n\n[[CHUNK_END]]\n`;
        }
        const prevNoMarker = stripChunkMarkers(combined);
        const contNoMarker = stripChunkMarkers(contText);
        const cleanedContNoMarker = removeOverlap(prevNoMarker, contNoMarker, 2600);
        combined = `${prevNoMarker.trim()}\n\n${cleanedContNoMarker.trim()}\n\n[[CHUNK_END]]\n`;
        words = countWords(stripChunkMarkers(combined));
        logChunk(`part-${chunk.part}-continue-${pass}`, {
          words,
          minTarget,
          addWordsTarget,
          lastSlug: lastSlug || null,
        });
      }
      combined = combined.trim();
      if (!combined) throw new Error("Chunk became empty after processing");
      // If still short on strict features, log it (even without FEATURE_DEBUG_CHUNKS)
      if (targetPages >= 90) {
        const w = countWords(stripChunkMarkers(combined));
        if (w < minWords) {
          console.log("[feature-chunk] WARNING chunk under minWords", {
            part: chunk.part,
            words: w,
            minWords,
            startScene: chunk.startScene,
            endScene: chunk.endScene,
          });
        }
      }
      return { ok: true, content: combined };
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
  let stitched = "";
  for (const rawChunk of stitchedChunks.filter(Boolean)) {
    const cleaned = stripChunkMarkers(rawChunk);
    if (!stitched) {
      stitched = cleaned.trim();
      continue;
    }
    const addition = removeOverlap(stitched, cleaned, 2600);
    stitched = `${stitched.trimEnd()}\n\n${addition.trimStart()}`.trim();
  }
  let scriptFountain = stripExtraFadeIn(stitched);
  scriptFountain = stripTheEndLines(scriptFountain);
  // Optional debug: final page estimate
  const w0 = countWords(scriptFountain);
  const p0 = estimatePagesFromWords(w0, SCRIPT_WORDS_PER_PAGE);
  if (FEATURE_DEBUG_CHUNKS) {
    console.log("[feature-script] final words/pages", {
      words: w0,
      estPages: p0,
      targetPages,
      wordsPerPage: SCRIPT_WORDS_PER_PAGE,
    });
  }
  // ✅ Final "top-off" if still too short — tighter enforcement
  const minFinalPagesWanted =
    targetPages >= 110 ? Math.max(100, Math.round(targetPages * 0.9)) :
    targetPages >= 90 ? Math.max(85, Math.round(targetPages * 0.92)) :
    targetPages >= 60 ? Math.max(55, Math.round(targetPages * 0.9)) :
    targetPages >= 30 ? Math.max(26, Math.round(targetPages * 0.9)) :
    Math.max(1, Math.round(targetPages * 0.85));
  let finalWords = w0;
  let finalPages = p0;
  if (finalPages < minFinalPagesWanted) {
    console.log("[feature-script] WARNING short feature before topoff", {
      finalWords,
      finalPages,
      minFinalPagesWanted,
      targetPages,
      wordsPerPage: SCRIPT_WORDS_PER_PAGE,
    });
  }
  if (finalPages < minFinalPagesWanted && FEATURE_FINAL_TOP_OFF_PASSES > 0) {
    for (let pass = 1; pass <= FEATURE_FINAL_TOP_OFF_PASSES; pass++) {
      finalWords = countWords(scriptFountain);
      finalPages = estimatePagesFromWords(finalWords, SCRIPT_WORDS_PER_PAGE);
      if (finalPages >= minFinalPagesWanted) break;
      const needPages = Math.max(1, minFinalPagesWanted - finalPages);
      const needWords = needPages * SCRIPT_WORDS_PER_PAGE;
      const addWordsTarget = clampInt(Math.round(needWords * 1.25), 1500, 9000);
      const prevClean = scriptFountain.trim();
      const tailText = tail(prevClean, FEATURE_CONTINUE_TAIL_CHARS);
      const lastLine = lastNonEmptyLine(prevClean);
      const lastSlug = extractLastSlugline(prevClean);
      const topOffPrompt = `
Continue the SAME screenplay in **Fountain** format to increase runtime/page count.
STRICT:
- Add at least ~${addWordsTarget} NEW words of screenplay text (dialogue + action).
- Do NOT repeat any existing text.
- No meta headings, no explanations, no “PART”, no summaries.
- Do NOT write "THE END".
If the story already feels concluded, extend the denouement/aftermath with 1–3 additional short scenes that feel natural and cinematic.
Anchor (last slugline if any): ${lastSlug || "(none found)"}
Exact last line (do NOT repeat it): ${lastLine || "(none)"}
LAST_OUTPUT_TAIL (for continuity; do NOT copy it):
<<<
${tailText}
>>>
`.trim();
      const maxTokensTopOff = clamp(Math.round(addWordsTarget * 2.5), 5000, 16000);
      const cont = await callOpenAIText(topOffPrompt, {
        temperature: 1,
        max_tokens: maxTokensTopOff,
        timeout_ms: DEFAULT_TEXT_CALL_TIMEOUT_MS,
        model: MODEL_TEXT_RAW,
        request_tag: `feature-topoff-${pass}`,
      });
      let contText = normalizeNewlines(cont.content || "").trim();
      if (!contText) break;
      const cleanedAdd = removeOverlap(scriptFountain, contText, 3000);
      scriptFountain = stripTheEndLines(`${scriptFountain.trimEnd()}\n\n${cleanedAdd.trimStart()}`.trim());
      finalWords = countWords(scriptFountain);
      finalPages = estimatePagesFromWords(finalWords, SCRIPT_WORDS_PER_PAGE);
      if (FEATURE_DEBUG_CHUNKS) {
        console.log("[feature-topoff] pass", {
          pass,
          addWordsTarget,
          words: finalWords,
          estPages: finalPages,
          minFinalPagesWanted,
        });
      }
    }
  }
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
You are an expert film character developer. Analyze this ${genre} film script and create REALISTIC, COHERENT character profiles that actually appear in and drive the narrative.

SCRIPT:
${script}

YOUR TASK:
1. Identify ALL main characters (protagonists, antagonists, key supporting roles) who actually appear in the script
2. For each character, extract their story role, arc, relationships, and how they drive the plot
3. Generate realistic visual descriptions that fit the ${genre} genre and story context
4. Create personality traits and moods consistent with the character's story role

CRITICAL REQUIREMENTS:
- ONLY include characters that actually appear in the script
- Each character's description must reference their role in the story
- Traits must be 3-5 specific personality characteristics relevant to their story arc
- Visual descriptions must be detailed (50+ words), cinematic, and film-production-ready
- Include physical appearance, clothing style, and distinctive features grounded in the story
- Consider genre conventions: ${genre} films typically feature [list context about character types in this genre]
- Mood should reflect the character's emotional baseline or primary emotional state in the story

Return JSON: { "characters": [...] } with the exact fields:
- name: Character name as it appears in script
- role: Clear role in story (e.g., "Protagonist", "Antagonist", "Love Interest", "Comic Relief")
- description: 2-3 sentences about the character's story purpose and personality (50+ words total)
- traits: Array of 3-5 specific personality/characteristic traits directly from their script behavior
- skinColor: Realistic descriptor (e.g., "Fair", "Olive", "Deep brown", "Golden") or hex code
- hairColor: Realistic descriptor (e.g., "Dark brown", "Blonde", "Red", "Grey") or hex code
- clothingColor: Primary clothing color that fits their character and story context (hex or descriptor)
- mood: Character's emotional baseline from the script (e.g., "Determined and conflicted", "Charismatic but cold")
- visualDescription: Detailed, cinematic description of their appearance as a professional actor would look (100+ words). Include: age range, physical build, facial features, distinctive marks, typical clothing style, overall presence. Make it screen-ready for casting or AI image generation.
- imageUrl: Always empty string ""

MOOD & VISUAL CONTEXT:
For ${genre} films, ensure characters fit the genre's visual and tonal conventions while remaining grounded in the script's specific story.
`.trim();
  const res = await callOpenAIJsonSchema<{ characters: Character[] }>(prompt, buildCharactersSchema(), {
    temperature: 0.4,
    max_tokens: 3200,
    request_tag: "characters",
    schema_name: "Characters",
    model: MODEL_JSON_RAW,
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
  // Reduced frame counts to fit within token budget (no coverage shots in initial generation)
  const numFrames = duration <= 5 ? 6 : duration <= 15 ? 10 : duration <= 30 ? 16 : duration <= 60 ? 24 : 32;
  // Scale token budget: ~350 tokens per frame for all fields, raise cap to 16000
  const storyboardMaxTokens = clamp(Math.round(numFrames * 350), 4000, 16000);
  const charSummary = characters.slice(0, 10).map(c =>
    `${c.name} (${c.role}): ${c.visualDescription || c.description || ""}`.slice(0, 200)
  ).join("\n");
  const prompt = `
You are a professional storyboard artist and cinematographer. Generate a shot-by-shot storyboard for this ${movieGenre} film.

FILM IDEA: ${movieIdea}

SCRIPT (trimmed):
${tail(script, 18000)}

KEY CHARACTERS:
${charSummary}

REQUIREMENTS — GENERATE EXACTLY ${numFrames} MAIN FRAMES:

For EACH main frame, provide these fields:
- scene: Scene heading (e.g. "INT. WAREHOUSE - NIGHT")
- shotNumber: Sequential shot ID (e.g. "1A", "1B", "2A")
- description: What is visually happening (2-3 sentences, vivid and specific)
- shotSize: ECU, CU, MCU, MS, MLS, LS, ELS, OS, POV, 2-Shot, or Insert
- cameraAngle: Eye Level, Low Angle, High Angle, Dutch/Tilted, Bird's Eye, Worm's Eye, or Overhead
- cameraMovement: Static, Pan Left, Pan Right, Tilt Up, Tilt Down, Dolly In, Dolly Out, Tracking, Crane, Handheld, Steadicam, Zoom In, Zoom Out
- lens: Focal length (e.g. "24mm Wide", "85mm Portrait", "135mm Telephoto")
- lighting: Setup (e.g. "Low key — single hard source", "Rembrandt", "Silhouette", "High Key")
- composition: Framing rule (e.g. "Rule of thirds — subject right", "Center frame", "Leading lines")
- duration: Shot duration (e.g. "3s", "5s")
- dialogue: Dialogue spoken (or "")
- soundEffects: Sound design (or "")
- actionNotes: Blocking/choreography (or "")
- transition: CUT TO:, DISSOLVE TO:, SMASH CUT:, MATCH CUT:, etc. Last frame: "FADE TO BLACK."
- notes: Director notes (or "")
- imagePrompt: MUST start with "Cinematic hand-drawn storyboard sketch, black and white pencil style, professional film storyboard, dramatic lighting, realistic proportions, strong composition," then include the specific shot type (wide establishing shot / medium action shot / close-up cinematic shot), then describe the scene with characters, environment, perspective, mood, silhouettes. Must include: "detailed line work, moody atmosphere, film pre-production storyboard, not photorealistic, no color, no text"
- imageUrl: Always ""

SHOT VARIETY:
- Mix ECU, CU, MS, LS — don't repeat the same size 3+ times in a row
- Use ELS/LS establishing shots at new scenes
- CU for emotional beats, MS for dialogue, tracking for dynamic moments

Return JSON: { "storyboard": [ ... ] }
`.trim();
  const res = await callOpenAIJsonSchema<{ storyboard: StoryboardFrame[] }>(prompt, buildStoryboardSchema(), {
    temperature: 0.4,
    max_tokens: storyboardMaxTokens,
    request_tag: "storyboard",
    schema_name: "Storyboard",
    model: MODEL_JSON_RAW,
  });
  let frames = res.data?.storyboard || [];
  frames = Array.isArray(frames) ? frames : [];
  const PROMPT_PREFIX = "Cinematic hand-drawn storyboard sketch, black and white pencil style, professional film storyboard, dramatic lighting, realistic proportions, strong composition,";
  const PROMPT_SUFFIX = "detailed line work, moody atmosphere, film pre-production storyboard, not photorealistic, no color, no text";
  frames = frames.map((f, idx) => {
    const sceneDesc = String(f.description || "A cinematic scene.");
    const sceneHeading = String(f.scene || "");
    const basePrompt = String(f.imagePrompt || "").startsWith("Cinematic hand-drawn")
      ? String(f.imagePrompt)
      : `${PROMPT_PREFIX} ${String(f.imagePrompt || sceneDesc)}, ${PROMPT_SUFFIX}`;
    // Generate 3 coverage shots per frame: wide, medium, close-up
    const coverageShots: StoryboardFrame[] = [
      {
        scene: sceneHeading,
        shotNumber: `${f.shotNumber || idx + 1}-W`,
        description: `Wide establishing shot: ${sceneDesc}`,
        shotSize: "ELS",
        cameraAngle: "Eye Level",
        cameraMovement: String(f.cameraMovement || "Static"),
        lens: "24mm Wide",
        lighting: String(f.lighting || "Natural"),
        composition: "Full environment visible, characters placed for scale",
        duration: String(f.duration || "3s"),
        dialogue: "",
        soundEffects: String(f.soundEffects || ""),
        actionNotes: "Establishing shot — sets mood, location, and scale",
        transition: "CUT TO:",
        notes: "",
        imagePrompt: `${PROMPT_PREFIX} wide establishing shot, ${sceneDesc} Full environment visible with character placement for scale. Strong depth and perspective, ${PROMPT_SUFFIX}`,
        imageUrl: "",
      },
      {
        scene: sceneHeading,
        shotNumber: `${f.shotNumber || idx + 1}-M`,
        description: `Medium action shot: ${sceneDesc}`,
        shotSize: "MS",
        cameraAngle: String(f.cameraAngle || "Eye Level"),
        cameraMovement: String(f.cameraMovement || "Static"),
        lens: "50mm Standard",
        lighting: String(f.lighting || "Natural"),
        composition: "Character movement and interaction emphasized",
        duration: String(f.duration || "3s"),
        dialogue: String(f.dialogue || ""),
        soundEffects: String(f.soundEffects || ""),
        actionNotes: "Action shot — focuses on character movement and body language",
        transition: "CUT TO:",
        notes: "",
        imagePrompt: `${PROMPT_PREFIX} medium action shot, ${sceneDesc} Strong body language and cinematic framing, character interaction visible, ${PROMPT_SUFFIX}`,
        imageUrl: "",
      },
      {
        scene: sceneHeading,
        shotNumber: `${f.shotNumber || idx + 1}-C`,
        description: `Close-up cinematic shot: ${sceneDesc}`,
        shotSize: "CU",
        cameraAngle: String(f.cameraAngle || "Eye Level"),
        cameraMovement: "Static",
        lens: "85mm Portrait",
        lighting: String(f.lighting || "Low Key"),
        composition: "Tight framing on face or key detail, dramatic lighting",
        duration: String(f.duration || "2s"),
        dialogue: String(f.dialogue || ""),
        soundEffects: "",
        actionNotes: "Close-up — emphasizes emotion, tension, or key story beat",
        transition: String(f.transition || "CUT TO:"),
        notes: "",
        imagePrompt: `${PROMPT_PREFIX} close-up cinematic shot, ${sceneDesc} Dramatic lighting and facial expression or key detail emphasized, shallow depth of field feel, ${PROMPT_SUFFIX}`,
        imageUrl: "",
      },
    ];
    return {
      ...f,
      shotNumber: String(f.shotNumber || `${idx + 1}A`),
      shotSize: String(f.shotSize || "MS"),
      cameraAngle: String(f.cameraAngle || "Eye Level"),
      lens: String(f.lens || "50mm Standard"),
      lighting: String(f.lighting || "Natural"),
      composition: String(f.composition || "Center frame"),
      transition: String(f.transition || "CUT TO:"),
      imagePrompt: basePrompt,
      imageUrl: "",
      coverageShots,
    };
  });
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
    model: MODEL_JSON_RAW,
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
    model: MODEL_JSON_RAW,
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
    model: MODEL_JSON_RAW,
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
    model: MODEL_JSON_RAW,
  });
  return { locations: res.data?.locations || [] };
};
// ---------- Sound Assets ----------
export const generateSoundAssets = async (script: string, genre: string) => {
  const words = countWords(script);
  const approxMinutes = clampInt(Math.round(words / SCRIPT_WORDS_PER_PAGE), 5, 180);
  const numAssets = approxMinutes <= 15 ? 6 : approxMinutes <= 30 ? 9 : approxMinutes <= 60 ? 12 : approxMinutes <= 90 ? 14 : 18;
  const prompt = `
You are a professional film sound designer and composer. Analyze this ${genre} film script and create a COHESIVE, SCENE-SPECIFIC sound design package.

SCRIPT:
${tail(script, 25000)}

SCRIPT DURATION (approx): ${approxMinutes} minutes

YOUR TASK:
1. Identify key scenes, emotional beats, and locations in the script
2. Create ${numAssets} sound assets (music, sfx, ambient, dialogue) that support the narrative pacing and emotional arc
3. Each asset must map to specific scenes or moments from the script
4. Generate detailed, production-ready audio descriptions for AI music/sound generation
5. Ensure audio design reinforces the ${genre} genre tone and story atmosphere

SOUND ASSET TYPES:
- Music: Orchestral scores, themes, underscore (emotional support for scenes)
- SFX: Sound effects for actions, impacts, environmental sounds (highly specific)
- Dialogue: Voice-over, narration, or specific spoken moments (only if relevant to story)
- Ambient: Atmosphere, tone, environmental soundscape for locations

CRITICAL REQUIREMENTS FOR EACH ASSET:
- Name: Descriptive, location/emotion-based (e.g., "Warehouse Chase Theme", "Rain on Rooftop Ambient")
- Type: One of: "music", "sfx", "dialogue", "ambient"
- Duration: 
  * For Music/ambient: minimum 00:30 (at least 30 seconds), ideal 1:00-3:00 for underscore
  * For SFX: 00:05-00:15 (5-15 seconds)
  * For Dialogue: 00:05-00:30
- Description: HIGHLY DETAILED (150+ words minimum!) audio generation prompt including:
  * Specific mood and emotional tone tied to the script scene
  * Instrumentation or sound elements (be very specific)
  * Tempo, intensity, and dynamics
  * Reference to the narrative moment it supports
  * For music: Key, tempo (BPM if applicable), style, instrumentation mix
  * For SFX: Exact sound characteristics, layer details, any processing
  * For ambient: Environmental details, frequency range, spatial characteristics
  * Cinematic reference comparisons (e.g., "similar to the tense underscore in Sicario during...")
- Scenes: Array of 2-5 specific scene descriptions from the script where this asset plays
- audioUrl: Always empty string ""

SOUND DESIGN PRINCIPLES:
- Create a cohesive sonic palette suited to the ${genre} genre
- Ensure musical themes have distinct identities and replay at key moments
- SFX should be sharp and realistic, integrated with music smoothly
- Ambient beds should sit underneath dialogue/music without competing
- Build emotional resonance through audio choices that mirror story beats

Example description format for audio generation:
"An intense, pulsing electronic score with dark undertones. Driving 140 BPM with heavy bass drops and staccato synth stabs. Layers include a minor key melodic hook (reminiscent of Blade Runner 2049's score), layered synthesizers creating tension, and occasional organic string elements. The progression builds from sparse and eerie to dense and overwhelming, perfect for the climactic confrontation in the thesis scene. Duration: 2:30. This track should feel cinematic, threatening, and cinematic—the audio equivalent of a dangerous predator stalking prey."

Return JSON:
{
  "soundAssets": [
    {
      "name": "...",
      "type": "music|sfx|dialogue|ambient",
      "duration": "MM:SS",
      "description": "At least 150 words, very specific for AI audio generation",
      "scenes": ["Specific scene from script", "Another scene location"],
      "audioUrl": ""
    }
  ]
}

VALIDATION:
- All durations must be at least 00:10 for music/ambient, 00:05 for SFX
- All descriptions must be 150+ words
- All scene references must map to actual script content
- No generic descriptions - each must be tailored to the specific narrative moment
`.trim();
  const res = await callOpenAIJsonSchema<{ soundAssets: any[] }>(prompt, buildSoundAssetsSchema(), {
    temperature: 0.45,
    max_tokens: 4000,
    request_tag: "sound",
    schema_name: "SoundAssets",
    model: MODEL_JSON_RAW,
  });
  let soundAssets: any[] = res.data?.soundAssets || [];
  const minDuration = approxMinutes >= 60 ? "00:30" : "00:15";
  soundAssets = soundAssets.map((asset) => {
    const [mins, secs] = String(asset.duration || "00:15")
      .split(":")
      .map((n: string) => parseInt(n, 10) || 0);
    const totalSecs = (mins || 0) * 60 + (secs || 0);
    const adjustedDuration = totalSecs >= 10 ? asset.duration : minDuration;
    return { ...asset, duration: adjustedDuration, audioUrl: "" };
  });
  return { soundAssets };
};