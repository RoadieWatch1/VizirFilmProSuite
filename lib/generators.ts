// C:\Users\vizir\VizirPro\lib\generators.ts
import OpenAI from "openai";
import {
  validateStoryboardFrame,
  validateFrameSequence,
  generateCompliantImagePrompt,
  getMultiFrameStrategy,
} from "./storyboardSpec";
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
// Upgraded to gpt-4.1 for higher-quality screenplay writing and structured output.
const MODEL_TEXT_RAW = (process.env.OPENAI_MODEL_TEXT || "gpt-4.1").trim(); // screenplay text
const MODEL_JSON_RAW = (process.env.OPENAI_MODEL_JSON || "gpt-4.1-mini").trim(); // structured JSON outputs
// ✅ Fallback models (used only if your chosen model is blocked/unavailable)
const FALLBACK_MODEL_TEXT = (process.env.OPENAI_FALLBACK_MODEL_TEXT || "gpt-4o").trim();
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
You are a WGA-caliber professional screenwriter with produced feature and episodic credits. You write with the economy of Aaron Sorkin, the visual clarity of Christopher Nolan, the character truth of Greta Gerwig, and the structural discipline of Tony Gilroy. Output ONLY screenplay text in **Fountain** format.

# CRAFT PRINCIPLES (NON-NEGOTIABLE)

## Structure
- Hit a recognizable three-act shape. Inciting incident in act one, midpoint reversal, all-is-lost before act three, decisive climax.
- Every scene must do at least TWO of: advance plot, reveal character, raise stakes, escalate conflict, plant/pay off a setup. If a scene does only one, cut or merge it.
- Start scenes as late as possible; end them as early as possible (Mamet's late-in / early-out).

## Show Don't Tell
- Reveal character through ACTION and SUBTEXT, never through direct statement or on-the-nose dialogue.
- BANNED tropes unless subverted: "I'm fine", "We need to talk", mirror monologues, characters announcing their own feelings, exposition dumps between strangers.
- If a character says what they want, they're lying or you're writing lazy. Rewrite.

## Dialogue
- Each character must have a distinct VOICE — idiolect, rhythm, vocabulary. Read the line aloud; if two characters could swap it, rewrite.
- Use subtext. People deflect, interrupt, lie, leave things unsaid.
- Avoid "as you know" exposition. Weaponize conflict to deliver backstory.
- Short beats. Trim adverbs. Let silence and action carry weight.

## Action Lines
- Present tense, active voice, concrete verbs. "She slams the door" not "She angrily closes the door."
- No camera direction unless essential ("ANGLE ON", "CLOSE ON" sparingly).
- No novelistic interiority ("She thinks about her mother"). Externalize — show the photo, the hesitation, the trembling hand.
- One-line action beats for pace. Longer paragraphs (max 4 lines) for atmosphere.
- White space is rhythm. Use it.

## Scene Headings (Slug Lines)
- INT./EXT. LOCATION - DAY/NIGHT (or DAWN/DUSK/CONTINUOUS/LATER where precise).
- NEVER exceed ~350 words of body without a new slug line.
- Reserve "MONTAGE" and "INTERCUT" for genuine structural choices.

## Genre-Aware Voice
- HORROR: dread through restraint; delay the monster; sound design implied ("A WHISPER — just behind her."); POV close and claustrophobic.
- THRILLER: ticking clock visible on page; information asymmetry; reversals every 8–12 pages.
- COMEDY: rule-of-three; comedic set-ups paid off late; character comedy over joke comedy; bits escalate.
- DRAMA: interior stakes externalized; quiet devastation; symbolic objects and recurring motifs.
- ACTION: geography first — establish spatial relationships before chaos; clarity of cause/effect in set-pieces; character in the choreography.
- SCI-FI / FANTASY: ground the unreal in sensory specifics; introduce rules once, enforce them always; world-building through character friction, not monologue.
- ROMANCE: obstacles are internal before external; meet-cute earns its name only if it reveals wound/want; longing in what's NOT said.
- CRIME / NOIR: moral compromise; procedural detail earns texture; dialogue clipped and loaded.

# FOUNTAIN FORMAT — STRICT
- Scene headings: INT./EXT./INT/EXT. flush left.
- Action: flush left, present tense.
- Character cues: UPPERCASE, centered-convention (just uppercase line).
- Parentheticals: sparing, lowercase, italic-style ("(beat)", "(softly)") — only when intent would otherwise be ambiguous.
- Dialogue: line under character cue.
- Transitions (FADE IN:, FADE OUT., SMASH CUT TO:, CUT TO:) only when they matter.
- No markdown, no JSON, no commentary, no meta labels ("PART 1", "CHUNK 2", "ACT I"). Continue seamlessly.

# FORBIDDEN
- Generic placeholder names (JOHN, JANE) unless deliberately archetypal.
- Clichés: "little did they know", "suddenly", "out of nowhere".
- Stage directions that require telepathy ("He realizes she lied").
- Block paragraphs of action longer than 4 lines.
- Summarizing emotion ("angry", "sad", "confused") — dramatize instead.

Write like the draft is going out to a producer in the morning.
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
export interface CastingSuggestion {
  name: string;           // Actor name — real, working actor
  reason: string;         // Why they fit — craft-specific argument
  notableWork: string;    // Film/show they're known for (helps readers recall)
}

export interface CharacterCasting {
  notes: string;                          // 2-3 sentences on what the role needs from an actor
  aList: CastingSuggestion[];             // 3 aspirational A-list
  midTier: CastingSuggestion[];           // 3 realistic mid-tier
  emerging: CastingSuggestion[];          // 3 emerging / indie-friendly
  characterActors: CastingSuggestion[];   // 2-3 character actors (scene-stealers)
  generatedAt?: number;
}

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
  casting?: CharacterCasting;
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
            type: { type: "string", enum: ["Interior", "Exterior"] },
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
/**
 * ✅ ENHANCED STORYBOARD GENERATION
 * - Uses strict film grammar from storyboardSpec.ts
 * - Generates 3 compliant frames per scene (establishing, action, detail)
 * - Validates all frames before returning
 * - Creates proper cinematographic language in prompts
 */
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
  // Generate main frames (coverage frames will be added per scene)
  const numMainFrames = duration <= 5 ? 4 : duration <= 15 ? 6 : duration <= 30 ? 8 : duration <= 60 ? 12 : 16;
  const storyboardMaxTokens = clamp(Math.round(numMainFrames * 400), 6000, 16000);

  const charSummary = characters.slice(0, 8).map(c =>
    `${c.name} (${c.role}): ${c.visualDescription || c.description || ""}`.slice(0, 180)
  ).join("\n");

  // ✅ STRICT STORYBOARD GRAMMAR PROMPT
  const prompt = `
You are a PROFESSIONAL STORYBOARD ARTIST and CINEMATOGRAPHER.
Your ONLY job is to generate battle-ready storyboard frames for a film productions.

FILM CONTEXT:
Genre: ${movieGenre}
Idea: ${movieIdea}

SCRIPT (trimmed):
${tail(script, 16000)}

KEY CHARACTERS:
${charSummary}

=================================================================
CRITICAL RULES (NON-NEGOTIABLE):
=================================================================

1. SHOT SIZE GRAMMAR (EXACT):
   - ELS: Environment dominates, character tiny reference
   - LS: Full body visible, ~30% of frame, environment shows context
   - MS: Waist-to-head, ~50-60% of frame, primary dialogue framing
   - CU: Face-only or hands-only, fills most of frame
   - OS: Over-shoulder dialogue, rear character 20%, front fills rest
   - INSERT: Object detail fills frame alone
   - 2-Shot: Both characters visible, ~30% each with space between

2. CAMERA ANGLES (STRICT ENFORCEMENT):
   - Low Angle: Camera MUST be below eye level, subject towers
   - High Angle: Camera MUST be above eye level, subject diminished
   - Eye Level: Neutral horizon, no power dynamic
   - Dutch Angle: Horizon tilted 30° visibly, chaos/danger intent
   - Bird's Eye: Camera directly overhead, map/surveillance view
   - Worm's Eye: Ground level extreme low, creature perspective

3. LENSES (PERSPECTIVE IS MANDATORY):
   - 24mm Wide: Exaggerated depth, foreground emphasis, slight distortion
   - 50mm Standard: Natural eye view, minimal distortion
   - 85mm Portrait: Compressed space, isolated subject, romantic feel
   - 135mm Telephoto: Heavy compression, stacked planes, surveillance mood

4. COMPOSITION (VISIBLE RULES):
   - Rule of Thirds: Subject on grid intersections, NOT centered
   - Center Frame: Subject dead-center, symmetrical authority
   - Leading Lines: Paths/shadows converge at subject
   - Frame within Frame: Foreground elements create secondary frame

5. SHOT VARIETY:
   - DO NOT repeat same shot size 3+ times consecutively
   - Mix ELS (5%), LS (20%), MS (40%), CU (25%), INSERT/OS (10%)
   - ELS for new locations, CU for emotional peaks

6. DIALOGUE & ACTION BLOCKING:
   - "dialogue" field: Exact spoken words if applicable, blank otherwise
   - "actionNotes": Specific choreography, movement, hand placement
   - NEVER generic action; be SPECIFIC (not "character walks" but "character crosses camera L→R, stops at door")

7. CAMERA MOVEMENT:
   - Static: Locked tripod
   - Pan/Tilt: Horizontal/vertical head movement
   - Dolly: Camera physically moves forward/backward
   - Tracking: Follows subject movement
   - Handheld: Intentional camera shake
   - Steadicam: Smooth flowing movement
   - Crane: Vertical rise/fall

=================================================================
GENERATE EXACTLY ${numMainFrames} MAIN FRAMES
=================================================================

For EACH frame, provide JSON with these EXACT fields:
{
  "scene": "INT/EXT. LOCATION - TIME", // Scene heading
  "shotNumber": "1A", // Sequential ID (1A, 2A, etc.)
  "description": "2-3 sentences vivid visual description",
  "shotSize": "LS|MS|CU|OS|2-Shot|ELS|INSERT|MCU|MLS|ECU|POV", // NO other values
  "cameraAngle": "Eye Level|Low Angle|High Angle|Dutch Angle|Bird's Eye|Worm's Eye", // EXACT match
  "cameraMovement": "Static|Pan|Tilt|Dolly|Tracking|Crane|Handheld|Steadicam|Zoom", // Specify direction
  "lens": "24mm Wide|50mm Standard|85mm Portrait|135mm Telephoto", // EXACT focal lengths
  "lighting": "High Key|Low Key|Rembrandt|Silhouette|Practical|Natural|Mixed", // EXACT terms
  "composition": "Rule of Thirds — [left|center|right]|Center Frame|Leading Lines|Frame within Frame",
  "duration": "Xs", // Shot duration (2s-10s typical)
  "dialogue": "Exact dialogue or empty string",
  "soundEffects": "Sound design description or empty string",
  "actionNotes": "SPECIFIC choreography, blocking, hand placement, movement direction",
  "transition": "CUT TO:|DISSOLVE TO:|SMASH CUT:|MATCH CUT:|FADE TO:", // For transitions
  "notes": "Director guidance or story intent",
  "imagePrompt": "Generated based on visual specification",
  "imageUrl": ""
}

RETURN ONLY:
{ "storyboard": [ ... frames ... ] }

NO COMMENTARY. NO EXPLANATIONS. JSON ONLY.
`.trim();

  const res = await callOpenAIJsonSchema<{ storyboard: StoryboardFrame[] }>(prompt, buildStoryboardSchema(), {
    temperature: 0.35,
    max_tokens: storyboardMaxTokens,
    request_tag: "storyboard",
    schema_name: "Storyboard",
    model: MODEL_JSON_RAW,
  });

  let frames = res.data?.storyboard || [];
  frames = Array.isArray(frames) ? frames : [];

  // ✅ POST-PROCESS: Validate and enhance frames with compliant image prompts
  frames = frames.map((f, idx) => {
    // Validate the frame
    const validation = validateStoryboardFrame(f);
    if (!validation.isValid) {
      console.warn(`⚠️ Frame ${idx + 1} validation issues:`, validation.errors);
    }

    // Generate compliant image prompt using storyboard spec
    const charNames = characters
      .slice(0, 3)
      .map(c => c.name)
      .filter(Boolean);

    const imagePrompt = generateCompliantImagePrompt({
      ...f,
      characters: charNames,
    });

    // Create 3-frame coverage strategy for each main frame
    const multiFrameStrategy = getMultiFrameStrategy(f.description || "");

    const coverageShots: StoryboardFrame[] = [
      {
        // FRAME 1: ESTABLISHING
        scene: f.scene,
        shotNumber: `${f.shotNumber}-EST`,
        description: `Establishing shot: ${f.description}`,
        shotSize: "LS",
        cameraAngle: "Eye Level",
        cameraMovement: "Static",
        lens: "24mm Wide",
        lighting: f.lighting || "Natural",
        composition: "Rule of Thirds — environment dominates left/right thirds",
        duration: "4s",
        dialogue: "",
        soundEffects: f.soundEffects || "",
        actionNotes: "Establish location, scale, and character placement. Wide perspective showing full environment.",
        transition: "CUT TO:",
        notes: "Set up spatial geography",
        imagePrompt: generateCompliantImagePrompt({
          description: `Wide establishing shot of ${f.scene}: ${f.description}`,
          shotSize: "LS",
          cameraAngle: "Eye Level",
          lens: "24mm Wide",
          lighting: f.lighting || "Natural",
          composition: "Rule of Thirds — environment left/right",
          actionNotes: "Full bodies visible, environment shows context and scale",
          characters: charNames,
        }),
        imageUrl: "",
      },
      {
        // FRAME 2: ACTION/DIALOGUE
        scene: f.scene,
        shotNumber: `${f.shotNumber}-ACT`,
        description: `Action shot: ${f.description}`,
        shotSize: "MS",
        cameraAngle: f.cameraAngle || "Eye Level",
        cameraMovement: f.cameraMovement || "Static",
        lens: "50mm Standard",
        lighting: f.lighting || "Natural",
        composition: f.composition || "Rule of Thirds — subject right",
        duration: "3s",
        dialogue: f.dialogue || "",
        soundEffects: "",
        actionNotes: f.actionNotes || "Character movement and interaction. Strong body language visible.",
        transition: "CUT TO:",
        notes: "Character performance, dialogue delivery, movement",
        imagePrompt: generateCompliantImagePrompt({
          description: `Medium action shot: ${f.description}`,
          shotSize: "MS",
          cameraAngle: f.cameraAngle || "Eye Level",
          lens: "50mm Standard",
          lighting: f.lighting || "Natural",
          composition: f.composition || "Rule of Thirds",
          actionNotes: f.actionNotes || "Emphasize character interaction and body language",
          characters: charNames,
        }),
        imageUrl: "",
      },
      {
        // FRAME 3: TENSION/DETAIL
        scene: f.scene,
        shotNumber: `${f.shotNumber}-DET`,
        description: `Detail shot: ${f.description}`,
        shotSize: "CU",
        cameraAngle: "Low Angle",
        cameraMovement: "Static",
        lens: "85mm Portrait",
        lighting: f.lighting || "Low Key",
        composition: "Center Frame — dramatic focus on face or critical detail",
        duration: "2s",
        dialogue: f.dialogue || "",
        soundEffects: "",
        actionNotes: "Tight framing. Emotional intensity. Psychological moment.",
        transition: f.transition || "CUT TO:",
        notes: "Close scrutiny of character emotion or critical plot detail",
        imagePrompt: generateCompliantImagePrompt({
          description: `Close-up detail shot: ${f.description}`,
          shotSize: "CU",
          cameraAngle: "Low Angle",
          lens: "85mm Portrait",
          lighting: f.lighting || "Low Key",
          composition: "Center Frame — tight dramatic",
          actionNotes: "Extreme close-up showing emotion, intensity, psychological state",
          characters: charNames,
        }),
        imageUrl: "",
      },
    ];

    return {
      scene: f.scene,
      shotNumber: String(f.shotNumber || `${idx + 1}A`),
      description: f.description,
      shotSize: String(f.shotSize || "MS"),
      cameraAngle: String(f.cameraAngle || "Eye Level"),
      cameraMovement: String(f.cameraMovement || "Static"),
      lens: String(f.lens || "50mm Standard"),
      lighting: String(f.lighting || "Natural"),
      composition: String(f.composition || "Rule of Thirds"),
      duration: String(f.duration || "3s"),
      dialogue: String(f.dialogue || ""),
      soundEffects: String(f.soundEffects || ""),
      actionNotes: String(f.actionNotes || ""),
      transition: String(f.transition || "CUT TO:"),
      notes: String(f.notes || ""),
      imagePrompt,
      imageUrl: "",
      coverageShots,
    };
  });

  // ✅ VALIDATE entire sequence
  const sequenceValidation = validateFrameSequence(frames);
  if (sequenceValidation.warnings.length > 0) {
    console.warn("⚠️ Sequence warnings:", sequenceValidation.warnings);
  }

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
export const generateBudget = async (genre: string, length: string, lowBudgetMode: boolean = false) => {
  const duration = parseLengthToMinutes(length);
  const baseBudget =
    duration <= 5 ? 5000 :
    duration <= 15 ? 15000 :
    duration <= 30 ? 50000 :
    duration <= 60 ? 100000 :
    duration <= 120 ? 200000 : 500000;
  const genreMultiplier = /sci[- ]?fi|action|fantasy|horror/i.test(genre) ? 1.5 : /drama|comedy|romance/i.test(genre) ? 0.85 : 1;
  const rawTotal = Math.round(baseBudget * genreMultiplier);
  const total = lowBudgetMode ? Math.round(rawTotal * 0.5) : rawTotal;
  const tier =
    total < 25000 ? "MICRO-BUDGET (sub-$25k — friends/favors, prosumer gear, no unions)"
    : total < 100000 ? "ULTRA-LOW (SAG Short Film / Ultra-Low Budget Agreement territory)"
    : total < 500000 ? "LOW-BUDGET INDIE (SAG Low Budget Agreement, regional crew, 3-4 week shoot)"
    : total < 2500000 ? "MODIFIED LOW (SAG Modified Low — more days, better DP/gear)"
    : total < 10000000 ? "MID-BUDGET INDIE (union crew, real distribution targets)"
    : "STUDIO (full union, A-list potential, wide release math)";
  const prompt = `
You are a seasoned UPM/line producer with 20+ years of indie + studio features. You know actual union minimums, real equipment rental rates (RED, ARRI, lighting packages), and how budgets actually get spent in 2026. Generate a REALISTIC, DETAILED budget breakdown for a ${genre} film of ${length} length.

Total estimated budget: $${total.toLocaleString()}
Budget tier: ${tier}
Budget mode: ${lowBudgetMode ? "LOW BUDGET (indie/guerrilla — favor deals, non-union, short days where legal)" : "STANDARD (indie professional — respects union minimums where applicable)"}

GENRE-SPECIFIC COST REALITY for ${genre}:
- Horror/Thriller: practical effects/creature, night exteriors, fog/atmospheric, insurance up for stunts.
- Action: stunt coordinator, rigging, slow-mo/high-speed camera, extra insurance, more shoot days per script minute.
- Sci-Fi/Fantasy: VFX post line dominates (often 20-35%), possible LED volume/greenscreen stage, heavier art dept.
- Period/Historical: wardrobe + production design balloon; location lock-offs; picture-cars.
- Drama/Romance/Comedy: dialogue-driven, efficient; weight goes to cast, locations, sound.
- Documentary: archival licensing, travel, long post timeline.

Return JSON:
{
  "categories": [
    {
      "name": "Category Name",
      "amount": number (USD, must be realistic),
      "percentage": number (all must sum to ~100),
      "items": [{"name": "Specific line item", "cost": number}],
      "tips": ["Practical cost-saving tip"],
      "alternatives": ["Cheaper alternative approach"]
    }
  ]
}

REQUIRED CATEGORIES (include ALL):
1. Pre-Production (script, storyboard, location scouting, permits)
2. Cast & Talent (actors, extras, casting director)
3. Crew (director, DP, gaffer, grip, sound, PA)
4. Locations & Set Design (rental, permits, set dressing, props)
5. Camera & Equipment (camera, lenses, lighting, grip, sound gear)
6. Post-Production (editing, color grading, VFX, DIT)
7. Music & Sound Design (composer, sound mix, foley, licensing)
8. Insurance & Legal (E&O, liability, contracts)
9. Marketing & Distribution (poster, trailer, festival submissions)
10. Contingency & Miscellaneous (10% buffer, petty cash, transport)

RULES:
- ALL category amounts MUST sum to exactly $${total.toLocaleString()}
- Percentages must total 100
- Each item must have a realistic cost that sums to category amount
- ${lowBudgetMode ? "Include practical cost-saving tips and cheap alternatives for EVERY category" : "Tips and alternatives can be general guidance"}
- Be specific: "RED Komodo rental 5 days @ $350/day" not just "camera rental"
`.trim();
  const res = await callOpenAIJsonSchema<{ categories: any[] }>(prompt, buildBudgetSchema(), {
    temperature: 0.25,
    max_tokens: 6000,
    request_tag: "budget",
    schema_name: "Budget",
    model: MODEL_JSON_RAW,
  });
  return res.data || { categories: [] };
};
// ---------- Schedule ----------
export const generateSchedule = async (script: string, length: string) => {
  // Estimate shooting days from script length
  const words = countWords(script);
  const approxMinutes = clampInt(Math.round(words / SCRIPT_WORDS_PER_PAGE), 1, 180);
  const shootDays =
    approxMinutes <= 1 ? 1
    : approxMinutes <= 5 ? 2
    : approxMinutes <= 10 ? 3
    : approxMinutes <= 30 ? clampInt(Math.round(approxMinutes / 5), 4, 8)
    : approxMinutes <= 60 ? clampInt(Math.round(approxMinutes / 4), 10, 18)
    : clampInt(Math.round(approxMinutes / 3), 18, 45);

  const prompt = `
You are an experienced 1st Assistant Director creating a professional shooting schedule.
Analyze this film script and create a realistic, day-by-day production schedule.

SCRIPT (${length}, approx ${approxMinutes} minutes):
"""
${tail(script, 20000)}
"""

SCHEDULING RULES:
- Create exactly ${shootDays} shooting days
- Group scenes by LOCATION to minimize company moves (shoot all scenes at one location before moving)
- Schedule exterior/daylight scenes early in the day, interior scenes later
- Put the most complex scenes (stunts, VFX, crowd) on days with fewer total scenes
- Each day should be 10-14 hours including setup, meals, and wrap
- Include specific crew departments needed per day
- Activities should be specific scene references, not generic descriptions

For each day provide:
- "day": "Day 1 — [Primary Location]" (include the main location in the day title)
- "activities": Array of 4-8 specific tasks like:
  * "7:00 AM — Crew call, set up lighting at [Location]"
  * "8:30 AM — Shoot Scene 3: [brief description]"
  * "10:00 AM — Shoot Scene 7: [brief description]"
  * "12:30 PM — Lunch break (1 hour)"
  * "1:30 PM — Shoot Scene 12: [brief description]"
  * "4:00 PM — Company move to [Next Location]"
  * "5:00 PM — Shoot Scene 15: [brief description]"
  * "7:00 PM — Wrap"
- "duration": Realistic hours like "12 hours" or "10 hours"
- "location": Primary shooting location for that day (from the script)
- "crew": Array of crew departments needed, e.g. ["Director", "DP", "Sound", "Gaffer", "Grip", "Art Dept", "Hair/Makeup", "PA x2"]

Return JSON:
{
  "schedule": [
    {
      "day": "Day 1 — Location Name",
      "activities": ["7:00 AM — Crew call, lighting setup", "8:30 AM — Shoot Scene 1: ..."],
      "duration": "12 hours",
      "location": "Location from script",
      "crew": ["Director", "DP", "Sound", "Gaffer"]
    }
  ]
}
`.trim();
  const res = await callOpenAIJsonSchema<{ schedule: any[] }>(prompt, buildScheduleSchema(), {
    temperature: 0.3,
    max_tokens: 6000,
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
You are a professional film location scout and production designer.
Analyze the following ${genre} film script and extract ALL distinct filming locations.

SCRIPT:
"""START_SCRIPT"""
${tail(usedScript, 20000)}
"""END_SCRIPT"""

Return JSON:
{
  "locations": [
    {
      "name": "Specific location name from script (e.g. 'Marcus's Apartment', 'Downtown Alley')",
      "type": "Interior" or "Exterior",
      "description": "2-3 sentences: what this location looks like, key visual elements, atmosphere",
      "mood": "Emotional tone (e.g. 'Tense and claustrophobic', 'Serene but foreboding')",
      "colorPalette": "Dominant colors for this location (e.g. 'Cool blues, steel grays, neon green accents')",
      "propsOrFeatures": ["Specific prop or set feature needed"],
      "scenes": ["Scene heading where this location appears"],
      "rating": 1-5 (production complexity: 1=simple, 5=complex),
      "lowBudgetTips": "How to achieve this on a micro budget",
      "highBudgetOpportunities": "What you'd add with more resources"
    }
  ]
}

RULES:
- Extract EVERY distinct location from script scene headings (INT./EXT.)
- Use the ACTUAL location names from the script, not generic placeholders
- "type" must be exactly "Interior" or "Exterior" (if INT/EXT use "Interior")
- "description" must be vivid and specific to THIS location, not generic
- "propsOrFeatures" must list concrete items (furniture, signage, vehicles, etc.)
- "scenes" must reference actual scene headings from the script
- "rating" reflects how hard this is to find/build (1=easy, 5=very complex)
- Never leave any field blank or generic
`.trim();
  const res = await callOpenAIJsonSchema<{ locations: any[] }>(prompt, buildLocationsSchema(), {
    temperature: 0.35,
    max_tokens: 6000,
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

// ---------- Script Coverage ----------
function buildCoverageSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "logline",
      "loglineAssessment",
      "synopsis",
      "structureAnalysis",
      "characterAnalysis",
      "dialogueAssessment",
      "themes",
      "marketability",
      "comparables",
      "overallRating",
      "overallNotes",
      "strengths",
      "weaknesses",
      "improvementNotes",
    ],
    properties: {
      logline: { type: "string" },
      loglineAssessment: {
        type: "object",
        additionalProperties: false,
        required: ["score", "strengths", "weaknesses", "rewrites"],
        properties: {
          score: { type: "number" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          rewrites: { type: "array", items: { type: "string" } },
        },
      },
      synopsis: { type: "string" },
      structureAnalysis: {
        type: "object",
        additionalProperties: false,
        required: ["overall", "notes", "act1", "act2", "act3"],
        properties: {
          overall: { type: "string" },
          notes: { type: "string" },
          act1: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "incitingIncident", "issues"],
            properties: {
              summary: { type: "string" },
              incitingIncident: { type: "string" },
              issues: { type: "array", items: { type: "string" } },
            },
          },
          act2: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "midpointReversal", "issues"],
            properties: {
              summary: { type: "string" },
              midpointReversal: { type: "string" },
              issues: { type: "array", items: { type: "string" } },
            },
          },
          act3: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "climax", "issues"],
            properties: {
              summary: { type: "string" },
              climax: { type: "string" },
              issues: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      characterAnalysis: {
        type: "object",
        additionalProperties: false,
        required: ["protagonist", "supporting", "notes"],
        properties: {
          protagonist: {
            type: "object",
            additionalProperties: false,
            required: ["name", "arc", "goal", "flaw", "notes"],
            properties: {
              name: { type: "string" },
              arc: { type: "string" },
              goal: { type: "string" },
              flaw: { type: "string" },
              notes: { type: "string" },
            },
          },
          antagonist: {
            type: "object",
            additionalProperties: false,
            required: ["name", "opposition", "motivation", "notes"],
            properties: {
              name: { type: "string" },
              opposition: { type: "string" },
              motivation: { type: "string" },
              notes: { type: "string" },
            },
          },
          supporting: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "function", "notes"],
              properties: {
                name: { type: "string" },
                function: { type: "string" },
                notes: { type: "string" },
              },
            },
          },
          notes: { type: "string" },
        },
      },
      dialogueAssessment: {
        type: "object",
        additionalProperties: false,
        required: ["rating", "strengths", "weaknesses", "examples"],
        properties: {
          rating: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          examples: { type: "array", items: { type: "string" } },
        },
      },
      themes: { type: "array", items: { type: "string" } },
      marketability: {
        type: "object",
        additionalProperties: false,
        required: ["audienceAppeal", "commercialViability", "notes"],
        properties: {
          audienceAppeal: { type: "string" },
          commercialViability: { type: "string" },
          notes: { type: "string" },
        },
      },
      comparables: { type: "array", items: { type: "string" } },
      overallRating: { type: "string" },
      overallNotes: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      weaknesses: { type: "array", items: { type: "string" } },
      improvementNotes: { type: "array", items: { type: "string" } },
    },
  };
}

export interface ScriptCoverage {
  logline: string;
  loglineAssessment: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    rewrites: string[];
  };
  synopsis: string;
  structureAnalysis: {
    overall: string;
    notes: string;
    act1: { summary: string; incitingIncident: string; issues: string[] };
    act2: { summary: string; midpointReversal: string; issues: string[] };
    act3: { summary: string; climax: string; issues: string[] };
  };
  characterAnalysis: {
    protagonist: { name: string; arc: string; goal: string; flaw: string; notes: string };
    antagonist?: { name: string; opposition: string; motivation: string; notes: string };
    supporting: { name: string; function: string; notes: string }[];
    notes: string;
  };
  dialogueAssessment: {
    rating: string;
    strengths: string[];
    weaknesses: string[];
    examples: string[];
  };
  themes: string[];
  marketability: {
    audienceAppeal: string;
    commercialViability: string;
    notes: string;
  };
  comparables: string[];
  overallRating: string;
  overallNotes: string;
  strengths: string[];
  weaknesses: string[];
  improvementNotes: string[];
  generatedAt?: number;
}

/**
 * Professional script coverage / script doctor notes.
 * Modeled on the Black List + Industrial Scripts coverage format.
 * Mirrors the kind of report a paid reader would deliver to a producer.
 */
export const generateScriptCoverage = async (
  script: string,
  genre: string,
  opts?: { title?: string; logline?: string },
): Promise<ScriptCoverage | null> => {
  const cleaned = (script || "").trim();
  if (!cleaned) return null;

  const title = opts?.title?.trim() || "Untitled";
  const priorLogline = opts?.logline?.trim() || "";

  const prompt = `
You are a veteran professional script reader for a major production company. You have read for Black List, A24, Neon, Annapurna, and major agencies (CAA, WME, UTA). You write tough-but-constructive coverage that producers and managers actually use to greenlight decisions.

Deliver coverage for this ${genre} screenplay. Title: "${title}".
${priorLogline ? `Writer's stated logline: "${priorLogline}"\n` : ""}
Apply industry standards rigorously. Do not be sycophantic. If the script is not working, say so and explain why in craft terms. If it's exceptional, say so — but back it up.

SCRIPT:
"""
${tail(cleaned, 60000)}
"""

Return JSON with these keys:
- "logline": One sentence, protagonist + goal + obstacle + stakes, present tense.
- "loglineAssessment":
  - "score": 1-10
  - "strengths": 2-4 bullets (what works about the concept)
  - "weaknesses": 2-4 bullets (what dulls the hook)
  - "rewrites": exactly 3 sharper alternative loglines
- "synopsis": 2-3 tight paragraphs, in order: setup → turn → conflict → climax → resolution. No spoiler hedging.
- "structureAnalysis":
  - "overall": one of "Strong", "Adequate", "Weak"
  - "notes": 2-4 sentences on structural rigor
  - "act1": { "summary", "incitingIncident", "issues" (array) }
  - "act2": { "summary", "midpointReversal", "issues" (array) }
  - "act3": { "summary", "climax", "issues" (array) }
- "characterAnalysis":
  - "protagonist": { "name", "arc" (how they change), "goal" (external want), "flaw" (internal lie), "notes" (2-3 sentences on craft) }
  - "antagonist": optional, same shape but { "name", "opposition", "motivation", "notes" }
  - "supporting": up to 5 { "name", "function" (role in story), "notes" }
  - "notes": overall character-craft assessment
- "dialogueAssessment":
  - "rating": one of "Excellent", "Good", "Fair", "Poor"
  - "strengths": 2-4 bullets
  - "weaknesses": 2-4 bullets
  - "examples": 2-4 short quoted lines (under 25 words each) illustrating strengths or problems, prefixed with "STRONG:" or "WEAK:"
- "themes": 3-5 thematic concerns the script dramatizes (not abstract words — specific claims)
- "marketability":
  - "audienceAppeal": who this is for, why they'd show up
  - "commercialViability": one of "High", "Moderate", "Low"
  - "notes": 2-3 sentences on distribution pathway (festival, streamer, theatrical, genre indie, etc.)
- "comparables": 3-5 recent produced films it could be pitched alongside ("X meets Y" is OK, but prefer concrete titles). Use real, well-known releases.
- "overallRating": EXACTLY one of "Recommend", "Consider", "Pass"
- "overallNotes": 3-5 sentences summarizing the verdict
- "strengths": 3-5 bullets (the report's top positives)
- "weaknesses": 3-5 bullets (the report's top concerns)
- "improvementNotes": 4-8 prioritized, actionable rewrite directives ("Push the inciting incident up 10 pages," "Give the antagonist a scene of grace," etc.)

RATING CALIBRATION (industry standard — be strict):
- "Recommend" = a producer should actively chase this. Rare. Professional-grade on almost every axis.
- "Consider" = has clear strengths but needs work before packaging. Most common outcome.
- "Pass" = fundamental structural, character, or concept issues that can't be fixed by polish.

Be specific. Cite pages, characters, scenes where useful. No vague generalities. No marketing puff. Return ONLY JSON matching the schema.
`.trim();

  const res = await callOpenAIJsonSchema<ScriptCoverage>(prompt, buildCoverageSchema(), {
    temperature: 0.35,
    max_tokens: 6000,
    request_tag: "coverage",
    schema_name: "ScriptCoverage",
    model: MODEL_JSON_RAW,
  });

  if (!res.data) return null;
  return { ...res.data, generatedAt: Date.now() };
};

// ============================================================
// SHOT LIST GENERATOR (HI-3)
// Professional shot list for pre-production — the document every
// 1st AD, DP, and director marks up on set. Modeled on StudioBinder /
// Celtx industry standards.
// ============================================================

export interface Shot {
  sceneNumber: string;        // "1", "1A", "2", etc. — matches slugline order
  shotNumber: string;         // "1", "2", "3" — sequential within scene
  slugline?: string;          // "INT. DINER - NIGHT"
  shotSize: string;           // ECU, CU, MCU, MS, MLS, LS, ELS, OS, 2-Shot, POV, Insert
  angle: string;              // Eye Level, Low Angle, High Angle, Dutch, Bird's Eye, Worm's Eye, OTS
  movement: string;           // Static, Pan, Tilt, Dolly, Tracking, Crane, Handheld, Steadicam, Zoom
  lens?: string;              // 24mm, 35mm, 50mm, 85mm, 135mm, etc.
  subject: string;            // Who / what is in the shot
  action: string;             // What happens — 1-2 sentences
  dialogueCue?: string;       // Opening line of dialogue in this shot, if any
  duration?: string;          // "3s", "8s", "12s"
  equipment?: string;         // Gimbal, slider, crane, tripod, drone, steadicam
  notes?: string;             // Lighting, VFX, SFX, safety, blocking reminders
  priority?: "Must-Have" | "Nice-to-Have" | "Coverage";
}

export interface ShotListScene {
  sceneNumber: string;
  slugline: string;
  dayNight?: string;          // "DAY" | "NIGHT" | "DAWN" | "DUSK" | "CONTINUOUS"
  location?: string;
  summary?: string;           // One-sentence beat of the scene
  estimatedMinutes?: number;  // Estimated screen time
  shots: Shot[];
}

export interface ShotList {
  title?: string;
  genre?: string;
  totalShots: number;
  totalScenes: number;
  notes?: string;
  scenes: ShotListScene[];
  generatedAt?: number;
}

function buildShotListSchema() {
  const shotSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "sceneNumber",
      "shotNumber",
      "slugline",
      "shotSize",
      "angle",
      "movement",
      "lens",
      "subject",
      "action",
      "dialogueCue",
      "duration",
      "equipment",
      "notes",
      "priority",
    ],
    properties: {
      sceneNumber: { type: "string" },
      shotNumber: { type: "string" },
      slugline: { type: "string" },
      shotSize: { type: "string" },
      angle: { type: "string" },
      movement: { type: "string" },
      lens: { type: "string" },
      subject: { type: "string" },
      action: { type: "string" },
      dialogueCue: { type: "string" },
      duration: { type: "string" },
      equipment: { type: "string" },
      notes: { type: "string" },
      priority: { type: "string" },
    },
  };
  const sceneSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "sceneNumber",
      "slugline",
      "dayNight",
      "location",
      "summary",
      "estimatedMinutes",
      "shots",
    ],
    properties: {
      sceneNumber: { type: "string" },
      slugline: { type: "string" },
      dayNight: { type: "string" },
      location: { type: "string" },
      summary: { type: "string" },
      estimatedMinutes: { type: "number" },
      shots: { type: "array", items: shotSchema },
    },
  };
  return {
    type: "object",
    additionalProperties: false,
    required: ["totalShots", "totalScenes", "notes", "scenes"],
    properties: {
      totalShots: { type: "number" },
      totalScenes: { type: "number" },
      notes: { type: "string" },
      scenes: { type: "array", items: sceneSchema },
    },
  };
}

/**
 * Professional shot list generator.
 * Input: raw screenplay text (Fountain or loose), optional storyboard frames & genre.
 * Output: scene-by-scene shot breakdown with industry-standard coverage.
 */
export const generateShotList = async (
  script: string,
  opts?: {
    genre?: string;
    title?: string;
    storyboard?: StoryboardFrame[];
    lowBudget?: boolean;
  },
): Promise<ShotList | null> => {
  const cleaned = (script || "").trim();
  if (!cleaned) return null;

  const genre = opts?.genre?.trim() || "drama";
  const title = opts?.title?.trim() || "Untitled";
  const lowBudget = Boolean(opts?.lowBudget);

  const storyboardHint =
    opts?.storyboard && opts.storyboard.length
      ? `\nEXISTING STORYBOARD HINTS (use as reference but do NOT be constrained by them — the shot list is more granular):\n${opts.storyboard
          .slice(0, 40)
          .map(
            (f, i) =>
              `  ${i + 1}. [${f.scene || "?"}] ${f.shotSize || "?"} · ${f.cameraAngle || "?"} · ${f.cameraMovement || "?"} — ${(f.description || "").slice(0, 140)}`,
          )
          .join("\n")}\n`
      : "";

  const budgetDirective = lowBudget
    ? `BUDGET CONSTRAINT: Micro-budget. Prefer tripod, handheld, natural light. Avoid crane, drone, steadicam, dolly track unless absolutely necessary for the story. Mark such shots as "Nice-to-Have".`
    : `BUDGET: Professional indie. Use crane/dolly/drone/steadicam where the story benefits. Justify each specialty shot in notes.`;

  const prompt = `
You are a veteran 1st Assistant Director and Director of Photography. You have shot lists from Roger Deakins, Rachel Morrison, Hoyte van Hoytema, and Bradford Young as references in your head. You build the exact document a professional crew needs to prep and shoot.

Break this ${genre} screenplay — "${title}" — into a professional shot list.

${budgetDirective}
${storyboardHint}

For EVERY scene in the script, produce:
- sceneNumber (string, sequential starting at "1")
- slugline (e.g. "INT. DINER - NIGHT")
- dayNight ("DAY" | "NIGHT" | "DAWN" | "DUSK" | "CONTINUOUS" | "MAGIC HOUR")
- location (the physical place, e.g. "Roadside Diner")
- summary (one sentence describing the dramatic beat)
- estimatedMinutes (screen time this scene will occupy — decimals OK)
- shots: array of 3-12 shots covering the scene properly

For EACH shot, produce:
- sceneNumber (must match parent scene)
- shotNumber (sequential within scene: "1", "2", "3" ...)
- slugline (repeat parent slugline)
- shotSize (one of: ECU, CU, MCU, MS, MLS, LS, ELS, OS, 2-Shot, POV, Insert)
- angle (Eye Level, Low Angle, High Angle, Dutch, Bird's Eye, Worm's Eye, OTS)
- movement (Static, Pan L→R, Pan R→L, Tilt Up, Tilt Down, Dolly In, Dolly Out, Tracking, Crane Up, Crane Down, Handheld, Steadicam, Zoom In, Zoom Out, Whip Pan)
- lens (concrete focal length with character, e.g. "35mm wide", "50mm standard", "85mm portrait", "135mm telephoto", "24mm wide", "18mm ultrawide")
- subject (who/what is in frame — specific character names)
- action (1-2 sentences describing what happens in the shot)
- dialogueCue (the first line of dialogue in this shot, if any — else empty string)
- duration (estimate: "2s", "5s", "10s", "15s")
- equipment (concrete gear: "Tripod", "Handheld", "Gimbal (DJI Ronin)", "Slider 3ft", "Jib 8ft", "Dolly + track 20ft", "Steadicam", "Drone", "Car mount")
- notes (lighting / VFX / SFX / safety / blocking reminders — be specific)
- priority (one of: "Must-Have", "Coverage", "Nice-to-Have")

COVERAGE RULES (industry standard):
- Every dialogue scene needs at least: 1 master/establishing + singles/OTS per speaking character + inserts for key props.
- Every action beat needs: 1 wide for geography + tighter shots for impact.
- Mark safety shots ("just in case" coverage) as "Coverage".
- Mark story-critical shots as "Must-Have".
- Mark stylistic flourishes as "Nice-to-Have".

SCRIPT:
"""
${tail(cleaned, 50000)}
"""

Also return:
- totalShots: total count across all scenes
- totalScenes: number of scenes covered
- notes: 2-4 sentences of production-wide notes (tone, recurring visual motifs, key technical challenges)

Return ONLY JSON matching the schema. Do not skip scenes. Do not invent scenes not in the script.
`.trim();

  const res = await callOpenAIJsonSchema<Omit<ShotList, "title" | "genre" | "generatedAt">>(
    prompt,
    buildShotListSchema(),
    {
      temperature: 0.35,
      max_tokens: 12000,
      request_tag: "shotlist",
      schema_name: "ShotList",
      model: MODEL_JSON_RAW,
    },
  );

  if (!res.data) return null;
  return {
    title,
    genre,
    ...res.data,
    generatedAt: Date.now(),
  };
};

// ============================================================
// DIRECTOR'S STATEMENT (HI-4 — pitch deck cornerstone)
// The personal first-person "why this film, why now, why me" piece
// that goes at the end of every professional pitch deck.
// ============================================================

export interface DirectorStatement {
  statement: string;          // The full 3-5 paragraph piece
  visualApproach: string;     // 2-3 sentences on shooting style / look
  tonalReference: string;     // "If Hereditary had a baby with Moonlight..."
  personalConnection: string; // Why this director — the why-me hook
  generatedAt?: number;
}

function buildDirectorStatementSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["statement", "visualApproach", "tonalReference", "personalConnection"],
    properties: {
      statement: { type: "string" },
      visualApproach: { type: "string" },
      tonalReference: { type: "string" },
      personalConnection: { type: "string" },
    },
  };
}

export const generateDirectorStatement = async (
  opts: {
    script?: string;
    logline?: string;
    synopsis?: string;
    genre?: string;
    themes?: string[];
    title?: string;
  },
): Promise<DirectorStatement | null> => {
  const genre = (opts.genre || "drama").trim();
  const title = (opts.title || "Untitled").trim();
  const logline = (opts.logline || "").trim();
  const synopsis = (opts.synopsis || "").trim();
  const themes = Array.isArray(opts.themes) ? opts.themes.filter(Boolean) : [];
  const script = (opts.script || "").trim();

  if (!logline && !synopsis && !script) return null;

  const prompt = `
You write director's statements for pitch decks that open doors at A24, Neon, Plan B, Killer Films, and the major festivals. The voice is personal, specific, first-person — the director speaking directly to a financier or producer. Not marketing. Not puffery. Craft and conviction.

PROJECT: "${title}" — a ${genre}

${logline ? `LOGLINE: ${logline}\n` : ""}
${synopsis ? `SYNOPSIS: ${synopsis}\n` : ""}
${themes.length ? `THEMES: ${themes.join(", ")}\n` : ""}
${script ? `\nOPENING OF SCRIPT (for voice calibration):\n"""\n${tail(script, 4000)}\n"""\n` : ""}

Write a director's statement package:

1. "statement" — 3-5 paragraphs, first person ("I"), under 400 words total.
   - Paragraph 1: Why this story, right now. What in the culture or the director's life demands it.
   - Paragraph 2: What the film is really about (subtext + theme), in plain terms.
   - Paragraph 3: The visual and tonal approach — cinematography, performance, pacing — in concrete craft terms.
   - Paragraph 4: Why the director is the only person who can make this film.
   - Optional paragraph 5: A closing image or line that lingers.

2. "visualApproach" — 2-3 sentences. Concrete: aspect ratio, lens preference, color palette, camera style, production design philosophy.

3. "tonalReference" — One sentence of the form "[Established film] meets [established film]" OR "If [director]'s [film] had the [quality] of [other film]." Use real, well-known titles.

4. "personalConnection" — 2-3 sentences on why the director, personally, is the right voice for this. Specific, not generic. Can reference craft lineage, lived experience, or obsession.

CRITICAL VOICE NOTES:
- First person. Conversational but precise.
- NO vague phrases like "human condition," "powerful story," "thought-provoking," "journey," "unforgettable."
- NO marketing speak. This reads like a filmmaker talking to a peer, not a press release.
- Specific images over abstract claims. "A teenager licking rain off her lips" beats "beauty in small moments."

Return ONLY JSON matching the schema.
`.trim();

  const res = await callOpenAIJsonSchema<DirectorStatement>(
    prompt,
    buildDirectorStatementSchema(),
    {
      temperature: 0.75,
      max_tokens: 1800,
      request_tag: "director-statement",
      schema_name: "DirectorStatement",
      model: MODEL_JSON_RAW,
    },
  );

  if (!res.data) return null;
  return { ...res.data, generatedAt: Date.now() };
};

// ============================================================
// SOCIAL MEDIA PACKAGE (HI-6)
// IG captions, X threads, TikTok hook, LinkedIn, hashtag sets,
// and a 4-week BTS content calendar. Everything the film's social
// team needs to launch a campaign — drafted by a seasoned indie
// film marketing strategist.
// ============================================================

export interface InstagramCaption {
  variant: string;       // "Mood Post", "Carousel Caption", "BTS Tease"
  caption: string;
  hashtags: string[];
  callToAction: string;
}

export interface TwitterThread {
  hookTweet: string;
  tweets: string[];      // each tweet body (excluding "2/" etc — we'll number in UI)
  callToAction: string;
}

export interface TikTokHookScript {
  hookLine: string;      // first 3 seconds — attention grab
  beats: string[];       // shot-by-shot text overlays / cuts
  voiceOver: string;     // spoken script, timed loosely to beats
  onScreenText: string;  // final text overlay
  caption: string;
  hashtags: string[];
}

export interface HashtagSet {
  label: string;         // "Core Film", "Genre Community", "Discovery"
  tags: string[];
}

export interface ContentCalendarEntry {
  week: number;
  theme: string;
  platforms: string[];
  contentIdea: string;
  callToAction: string;
}

export interface SocialPackage {
  headline: string;                              // the pitch in one line — for bio / headers
  positioning: string;                           // 2-3 sentence marketing positioning
  instagramCaptions: InstagramCaption[];         // 3
  twitterThreads: TwitterThread[];               // 2
  tiktokHook: TikTokHookScript;                  // 1
  linkedinAnnouncement: string;                  // 1
  hashtagSets: HashtagSet[];                     // 3
  contentCalendar: ContentCalendarEntry[];       // 4 weeks
  generatedAt?: number;
}

function buildSocialPackageSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "headline",
      "positioning",
      "instagramCaptions",
      "twitterThreads",
      "tiktokHook",
      "linkedinAnnouncement",
      "hashtagSets",
      "contentCalendar",
    ],
    properties: {
      headline: { type: "string" },
      positioning: { type: "string" },
      instagramCaptions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["variant", "caption", "hashtags", "callToAction"],
          properties: {
            variant: { type: "string" },
            caption: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            callToAction: { type: "string" },
          },
        },
      },
      twitterThreads: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["hookTweet", "tweets", "callToAction"],
          properties: {
            hookTweet: { type: "string" },
            tweets: { type: "array", items: { type: "string" } },
            callToAction: { type: "string" },
          },
        },
      },
      tiktokHook: {
        type: "object",
        additionalProperties: false,
        required: [
          "hookLine",
          "beats",
          "voiceOver",
          "onScreenText",
          "caption",
          "hashtags",
        ],
        properties: {
          hookLine: { type: "string" },
          beats: { type: "array", items: { type: "string" } },
          voiceOver: { type: "string" },
          onScreenText: { type: "string" },
          caption: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
        },
      },
      linkedinAnnouncement: { type: "string" },
      hashtagSets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "tags"],
          properties: {
            label: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
      contentCalendar: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["week", "theme", "platforms", "contentIdea", "callToAction"],
          properties: {
            week: { type: "number" },
            theme: { type: "string" },
            platforms: { type: "array", items: { type: "string" } },
            contentIdea: { type: "string" },
            callToAction: { type: "string" },
          },
        },
      },
    },
  };
}

export const generateSocialPackage = async (opts: {
  logline?: string;
  synopsis?: string;
  genre?: string;
  themes?: string[];
  title?: string;
  targetAudience?: string;
  releaseStage?: "development" | "pre-production" | "production" | "post" | "festival" | "release";
}): Promise<SocialPackage | null> => {
  const genre = (opts.genre || "drama").trim();
  const title = (opts.title || "Untitled").trim();
  const logline = (opts.logline || "").trim();
  const synopsis = (opts.synopsis || "").trim();
  const themes = Array.isArray(opts.themes) ? opts.themes.filter(Boolean) : [];
  const stage = opts.releaseStage || "production";
  const audience = (opts.targetAudience || "").trim();

  if (!logline && !synopsis) return null;

  const prompt = `
You are an indie film marketing strategist who has launched A24, Neon, IFC, and Mubi titles. You've run campaigns for Sundance premieres and micro-budget distribution. You write social copy that sounds like a filmmaker — specific, moody, confident — not a marketing template.

PROJECT: "${title}" — a ${genre}
STAGE: ${stage}
${audience ? `TARGET AUDIENCE: ${audience}\n` : ""}
${logline ? `LOGLINE: ${logline}\n` : ""}
${synopsis ? `SYNOPSIS: ${synopsis}\n` : ""}
${themes.length ? `THEMES: ${themes.join(", ")}\n` : ""}

Produce a launch-ready social package. Every piece must feel native to its platform — not recycled copy.

1. "headline" — The pitch in ≤12 words. Usable as IG bio / site hero / header tag.

2. "positioning" — 2-3 sentences of positioning: who this is for, why it matters, what tonal shelf it sits on. Pitch-deck voice, not ad voice.

3. "instagramCaptions" — EXACTLY 3, each:
   - variant: one of "Mood Post", "Carousel Caption", "BTS Tease"
   - caption: 80-180 words; first line is a hook, second line is white space, body is evocative and specific. No em-dashes as a stylistic tic.
   - hashtags: 8-12 relevant tags (mix niche + broader)
   - callToAction: one-liner (e.g. "Link in bio." / "DM for press access.")

4. "twitterThreads" — EXACTLY 2 teaser threads, each:
   - hookTweet: a single tweet ≤240 chars that stops the scroll. No question marks unless the hook demands one.
   - tweets: 4-6 follow-up tweets, each ≤240 chars, concrete images over abstractions
   - callToAction: the final tweet as a soft ask

5. "tiktokHook" — a 15-30s vertical video script:
   - hookLine: what's said / shown in the first 3s
   - beats: 5-8 on-screen beats (cuts / text cards)
   - voiceOver: full spoken script, under 70 words
   - onScreenText: final overlay
   - caption: 120-220 char caption
   - hashtags: 6-10 tags, mix #indiefilm + genre-specific + FYP-friendly

6. "linkedinAnnouncement" — ONE post, 180-300 words, founder/director voice. The opening line is the hook. Third-person polish, not corporate-speak.

7. "hashtagSets" — EXACTLY 3 sets:
   - "Core Film" (craft / industry tags — #indiefilm, #filmmaking, #screenwriting-adjacent)
   - "Genre Community" (audience tags specific to ${genre} — real, active communities)
   - "Discovery" (trending or algorithmic tags that could push the post)

8. "contentCalendar" — 4-week rollout plan, EXACTLY 4 entries (weeks 1-4), each:
   - week (1-4)
   - theme (e.g. "Concept reveal", "Character intros", "BTS day-in-the-life", "Soft launch")
   - platforms (subset of ["Instagram", "TikTok", "X", "LinkedIn", "YouTube Shorts"])
   - contentIdea: specific piece of content to post that week
   - callToAction: ask of the audience

STYLE RULES:
- No clichés: "epic," "journey," "powerful," "emotional," "unforgettable," "mind-blowing," "roller-coaster," "must-watch."
- No AI tell: em-dash tics, hedging phrases, "it's not just X — it's Y."
- Use concrete imagery from the script/synopsis when possible. Quote a beat, don't summarize it.
- Hashtags always start with # and contain no spaces. No hashtags with over 30 characters.
- For ${genre}, lean into the subcultures and communities that already post about this genre on each platform.

Return ONLY JSON matching the schema.
`.trim();

  const res = await callOpenAIJsonSchema<SocialPackage>(
    prompt,
    buildSocialPackageSchema(),
    {
      temperature: 0.8,
      max_tokens: 4500,
      request_tag: "social-package",
      schema_name: "SocialPackage",
      model: MODEL_JSON_RAW,
    },
  );

  if (!res.data) return null;
  return { ...res.data, generatedAt: Date.now() };
};

// ============================================================
// DISTRIBUTION & FESTIVAL STRATEGY (HI-8)
// Festival circuit, submission calendar, distribution pathway,
// platform-specific pitch angles, PR playbook, sales agent shortlist.
// Modeled after the playbook a festival strategist / sales rep uses.
// ============================================================

export interface FestivalTarget {
  name: string;
  tier: string;             // "A-list" | "Top Genre" | "Regional" | "Specialty" | "Shorts"
  location: string;
  submissionWindow: string; // e.g. "Opens August 2026, closes September 2026"
  notificationDate: string; // e.g. "Late November 2026"
  festivalDate: string;     // e.g. "January 2027"
  fee: string;              // "$60-$120"
  fitScore: string;         // "Must Submit" | "Strong Fit" | "Worth Trying" | "Reach"
  fitReasoning: string;     // 1-2 sentences — WHY this festival for this film
}

export interface SubmissionPhase {
  phase: string;            // e.g. "Phase 1 — A-list Swings (Q3 2026)"
  window: string;           // "Aug–Oct 2026"
  milestones: string[];     // concrete actions
}

export interface DistributionPathway {
  pathway: string;          // "Festival → Boutique Theatrical → Streaming (A24 / Neon model)"
  description: string;
  bestFor: string;
  risks: string;
  exampleFilms: string[];   // real titles that took this path
}

export interface PlatformPitch {
  platform: string;         // "A24", "Neon", "Mubi", "IFC Films", "Netflix Original", "Shudder"
  why: string;              // why this platform for this film
  pitchAngle: string;       // how to position it in conversation
  contactNotes: string;     // practical access path — reps, festivals, open submissions
}

export interface PRPhase {
  phase: string;            // "Pre-Festival Buzz", "Premiere Night", "Post-Festival"
  window: string;
  tactics: string[];
}

export interface SalesAgent {
  name: string;             // e.g. "Cinetic Media", "UTA Independent Film Group"
  fit: string;              // why they fit this film
  note: string;             // practical advice on approaching them
}

export interface DistributionStrategy {
  positioning: string;             // 2-3 sentences — market positioning statement
  tierAssessment: string;          // "This script sits at the A-list festival tier because..."
  festivals: FestivalTarget[];
  submissionTimeline: SubmissionPhase[];
  distributionPathways: DistributionPathway[];
  platformPitches: PlatformPitch[];
  prStrategy: PRPhase[];
  salesAgents: SalesAgent[];
  risks: string[];
  quickWins: string[];
  generatedAt?: number;
}

function buildDistributionStrategySchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "positioning",
      "tierAssessment",
      "festivals",
      "submissionTimeline",
      "distributionPathways",
      "platformPitches",
      "prStrategy",
      "salesAgents",
      "risks",
      "quickWins",
    ],
    properties: {
      positioning: { type: "string" },
      tierAssessment: { type: "string" },
      festivals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "tier",
            "location",
            "submissionWindow",
            "notificationDate",
            "festivalDate",
            "fee",
            "fitScore",
            "fitReasoning",
          ],
          properties: {
            name: { type: "string" },
            tier: { type: "string" },
            location: { type: "string" },
            submissionWindow: { type: "string" },
            notificationDate: { type: "string" },
            festivalDate: { type: "string" },
            fee: { type: "string" },
            fitScore: { type: "string" },
            fitReasoning: { type: "string" },
          },
        },
      },
      submissionTimeline: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["phase", "window", "milestones"],
          properties: {
            phase: { type: "string" },
            window: { type: "string" },
            milestones: { type: "array", items: { type: "string" } },
          },
        },
      },
      distributionPathways: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["pathway", "description", "bestFor", "risks", "exampleFilms"],
          properties: {
            pathway: { type: "string" },
            description: { type: "string" },
            bestFor: { type: "string" },
            risks: { type: "string" },
            exampleFilms: { type: "array", items: { type: "string" } },
          },
        },
      },
      platformPitches: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["platform", "why", "pitchAngle", "contactNotes"],
          properties: {
            platform: { type: "string" },
            why: { type: "string" },
            pitchAngle: { type: "string" },
            contactNotes: { type: "string" },
          },
        },
      },
      prStrategy: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["phase", "window", "tactics"],
          properties: {
            phase: { type: "string" },
            window: { type: "string" },
            tactics: { type: "array", items: { type: "string" } },
          },
        },
      },
      salesAgents: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "fit", "note"],
          properties: {
            name: { type: "string" },
            fit: { type: "string" },
            note: { type: "string" },
          },
        },
      },
      risks: { type: "array", items: { type: "string" } },
      quickWins: { type: "array", items: { type: "string" } },
    },
  };
}

export const generateDistributionStrategy = async (opts: {
  logline?: string;
  synopsis?: string;
  genre?: string;
  length?: string;
  themes?: string[];
  title?: string;
  budgetTier?: "micro" | "indie" | "mid" | "studio"; // optional — adjusts pathways
}): Promise<DistributionStrategy | null> => {
  const genre = (opts.genre || "drama").trim();
  const title = (opts.title || "Untitled").trim();
  const logline = (opts.logline || "").trim();
  const synopsis = (opts.synopsis || "").trim();
  const themes = Array.isArray(opts.themes) ? opts.themes.filter(Boolean) : [];
  const length = (opts.length || "").trim();
  const budgetTier = opts.budgetTier || "indie";

  if (!logline && !synopsis) return null;

  const thisYear = new Date().getFullYear();
  const nextYear = thisYear + 1;

  const lengthGuide = /short|10\s*min|under\s*30/i.test(length)
    ? "This is a SHORT film — prioritize shorts-eligible festivals (Sundance Shorts, SXSW Shorts, Aspen Shortsfest, Palm Springs ShortFest, Clermont-Ferrand). Skip feature-only venues."
    : /feature|90|120/i.test(length)
    ? "This is a FEATURE — target A-list and top genre feature competitions."
    : "Infer feature vs. short from context, but err toward feature-length pathway if unclear.";

  const budgetGuide: Record<string, string> = {
    micro:
      "Micro-budget (<$250K). Theatrical distribution unlikely without a festival anchor (Sundance/SXSW/Tribeca). Realistic pathway: festival premiere → streaming sale (Netflix/Hulu/AMC+) or SVOD aggregator (1091, Gravitas Ventures).",
    indie:
      "Indie ($250K-$5M). Boutique theatrical is viable if a top-3 festival accepts (A24/Neon/IFC Films/Magnolia/Bleecker Street). Realistic fallback: Hulu, Mubi, Criterion Channel, or streamer original.",
    mid: "Mid-budget ($5M-$20M). Needs a sales agent (Cinetic, UTA, WME, CAA) and a distribution guarantee. Aim for Sundance/Cannes/TIFF premiere with Neon/A24/Searchlight as targets.",
    studio: "Studio-backed. Distribution is usually pre-sold; festival strategy is about prestige positioning for awards and press.",
  };

  const prompt = `
You are a veteran festival strategist and sales rep. You've placed films at Sundance, SXSW, Tribeca, TIFF, Berlin, Cannes, Venice, and genre circuits (Fantasia, Fantastic Fest, Beyond Fest, SITGES). You advise filmmakers on the real, current (${thisYear}-${nextYear}) distribution landscape — not what was true five years ago.

PROJECT: "${title}" — a ${genre}
${length ? `LENGTH: ${length}\n` : ""}
${logline ? `LOGLINE: ${logline}\n` : ""}
${synopsis ? `SYNOPSIS: ${synopsis}\n` : ""}
${themes.length ? `THEMES: ${themes.join(", ")}\n` : ""}

LENGTH GUIDANCE: ${lengthGuide}
BUDGET TIER GUIDANCE: ${budgetGuide[budgetTier]}

Deliver a complete, current, and actionable distribution and festival strategy.

1. "positioning" — 2-3 sentences. Pitch-level market positioning: what shelf this sits on, what it competes with, why a buyer would want it.

2. "tierAssessment" — 2-3 sentences. Honest assessment: is this an A-list festival contender, a top genre circuit fit, a regional/specialty play, or a shorts-festival play? Justify.

3. "festivals" — 8-12 real, named, currently-active festivals. For EACH:
   - name (real festival, active ${thisYear}-${nextYear})
   - tier ("A-list", "Top Genre", "Regional", "Specialty", "Shorts")
   - location (city, country)
   - submissionWindow (real month range — e.g. "FilmFreeway opens August ${thisYear}, regular deadline September ${thisYear}")
   - notificationDate (e.g. "Late November ${thisYear}")
   - festivalDate (e.g. "January ${nextYear}")
   - fee (realistic USD range)
   - fitScore ("Must Submit", "Strong Fit", "Worth Trying", "Reach")
   - fitReasoning (WHY this festival for THIS film — reference the story / themes / genre)

   Cover a mix: 2-3 A-list swings, 3-5 strong-fit genre/specialty, 2-3 regional anchors, and 1-2 reach picks. For genre films, include the genre-specific majors (Fantastic Fest / Sitges / Fantasia / Beyond Fest for horror/sci-fi; Tribeca / DOC NYC / IDFA for docs; Slamdance for experimental).

4. "submissionTimeline" — 3-5 phases. Each phase:
   - phase ("Phase 1 — Fall A-list Swings")
   - window ("August–October ${thisYear}")
   - milestones (3-6 concrete actions — e.g. "Finalize FilmFreeway profile with press photos + sizzle", "Request Sundance fee waiver via WAV program if eligible")

5. "distributionPathways" — 3-4 realistic pathways ranked by fit. Each:
   - pathway ("Festival Premiere → Boutique Theatrical → Streaming Window")
   - description (how it works — 2-3 sentences)
   - bestFor (what this pathway requires to work)
   - risks (what kills this pathway)
   - exampleFilms (3-5 real titles that took this path recently)

6. "platformPitches" — 5-7 specific distributors/streamers. Each:
   - platform (real: A24, Neon, IFC Films, Magnolia, Mubi, Shudder, Searchlight, Netflix Original, Hulu, Prime Video, AMC+, Criterion Channel, Gravitas Ventures, Utopia, Oscilloscope, etc. — match to genre/tone)
   - why (specific argument why THIS film for THIS platform — cite their slate)
   - pitchAngle (the in-the-room pitch — one sentence)
   - contactNotes (realistic access path — "Open submissions closed — access via sales rep", "Shudder takes unsolicited genre shorts via their festival pipeline", etc.)

7. "prStrategy" — 3-4 phases (pre-festival, premiere, post-festival/release):
   - phase, window, tactics (3-6 concrete tactics per phase — e.g. "Place first-look exclusive with IndieWire 2 weeks before Sundance announcement")

8. "salesAgents" — 4-6 real sales/distribution reps active in ${thisYear}-${nextYear}:
   - name (real company — Cinetic Media, UTA Independent Film Group, CAA Media Finance, WME Independent, Endeavor Content, Submarine, Visit Films, Memento International, MK2, The Match Factory, etc.)
   - fit (why they'd be right for this film — cite their slate)
   - note (practical advice — "Best accessed via a festival premiere", "Open to cold email if film has press")

9. "risks" — 4-6 specific risks in this strategy (genre saturation, timing conflicts, casting gaps, press angle gaps).

10. "quickWins" — 3-5 high-leverage, do-this-now moves (cheap or free actions that materially improve odds).

HARD RULES:
- Only name REAL festivals, distributors, sales agents that exist as of ${thisYear}.
- Dates must be in the near future (${thisYear}-${nextYear} cycle).
- No made-up festival programs, no fictional distributors, no generic "submit to top festivals."
- Reference the script's actual story/themes when justifying fit. Generic advice is a fail.
- Be honest. If this is a regional play, say so. Don't promise Sundance to every micro-budget drama.

Return ONLY JSON matching the schema.
`.trim();

  const res = await callOpenAIJsonSchema<DistributionStrategy>(
    prompt,
    buildDistributionStrategySchema(),
    {
      temperature: 0.55,
      max_tokens: 7000,
      request_tag: "distribution",
      schema_name: "DistributionStrategy",
      model: MODEL_JSON_RAW,
    },
  );

  if (!res.data) return null;
  return { ...res.data, generatedAt: Date.now() };
};

// ============================================================
// CASTING SUGGESTIONS (HI-9)
// Per-character casting shortlists — A-list aspirational, mid-tier
// realistic, emerging indie-friendly, plus character-actor wildcards.
// Modeled on a professional casting director's memo.
// ============================================================

function buildCastingSuggestionsSchema() {
  const castingItem = {
    type: "object",
    additionalProperties: false,
    required: ["name", "reason", "notableWork"],
    properties: {
      name: { type: "string" },
      reason: { type: "string" },
      notableWork: { type: "string" },
    },
  };
  return {
    type: "object",
    additionalProperties: false,
    required: ["notes", "aList", "midTier", "emerging", "characterActors"],
    properties: {
      notes: { type: "string" },
      aList: { type: "array", items: castingItem },
      midTier: { type: "array", items: castingItem },
      emerging: { type: "array", items: castingItem },
      characterActors: { type: "array", items: castingItem },
    },
  };
}

export const generateCastingSuggestions = async (
  character: Character,
  opts?: {
    genre?: string;
    title?: string;
    logline?: string;
    synopsis?: string;
    themes?: string[];
  },
): Promise<CharacterCasting | null> => {
  if (!character?.name || !character?.description) return null;

  const genre = (opts?.genre || "drama").trim();
  const title = (opts?.title || "Untitled").trim();
  const logline = (opts?.logline || "").trim();
  const synopsis = (opts?.synopsis || "").trim();
  const themes = Array.isArray(opts?.themes)
    ? opts!.themes!.filter(Boolean)
    : [];

  const thisYear = new Date().getFullYear();

  const prompt = `
You are a veteran casting director with Oscar-nominated credits. You've cast for A24, Neon, Searchlight, Plan B, and HBO. You build realistic casting shortlists — not fantasy dream lists. Your suggestions are actors who are ALIVE, CURRENTLY WORKING as of ${thisYear}, and age-appropriate for the role.

PROJECT: "${title}" — a ${genre}
${logline ? `LOGLINE: ${logline}\n` : ""}
${synopsis ? `SYNOPSIS: ${synopsis}\n` : ""}
${themes.length ? `THEMES: ${themes.join(", ")}\n` : ""}

ROLE TO CAST:
- Name: ${character.name}
- ${character.role ? `Role: ${character.role}\n` : ""}- Description: ${character.description}
${character.traits && character.traits.length ? `- Traits: ${character.traits.join(", ")}\n` : ""}${character.mood ? `- Mood: ${character.mood}\n` : ""}${character.visualDescription ? `- Visual: ${character.visualDescription}\n` : ""}

Produce a professional casting memo for this role:

1. "notes" — 2-3 sentences. What this role specifically requires from an actor — physicality, emotional register, specific craft skill (e.g. "needs an actor who can hold silence," "requires subtle menace without heavies"). Not generic.

2. "aList" — EXACTLY 3 A-list names. Bankable stars currently opening films/limited series in ${thisYear}. Big paychecks, packaging-tier.

3. "midTier" — EXACTLY 3 mid-tier names. Respected working actors with a visible body of work — festival faves, critically-acclaimed TV leads, indie-prestige regulars. Realistic asks at a $2-10M budget.

4. "emerging" — EXACTLY 3 emerging/indie-friendly names. Actors with buzz in the last 2-3 years but not yet name-above-title. Micro-budget reachable with the right script.

5. "characterActors" — 2-3 character-actor wildcards. Scene-stealers / reliable supporting talents. The kind of casting that elevates a scene regardless of budget tier.

FOR EACH actor, include:
- name: Real actor, first-and-last, alive and working.
- reason: 1-2 sentences on why they fit THIS role (reference the description, the emotional register, specific craft qualities). Not generic.
- notableWork: One role that will help the reader instantly recall them (film/show + role or title).

HARD RULES:
- Only REAL, LIVING, CURRENTLY ACTIVE actors. If you're unsure if they're still working, pick someone else.
- Match the character's age, gender presentation, and physicality. Don't suggest a 65-year-old for a 20-year-old role.
- Diversify the shortlist where the role doesn't demand specificity — don't repeat the same actor archetype across tiers.
- No dead actors. No retired actors. No actors who haven't appeared in anything in 5+ years.
- Reasoning must reference specific craft qualities tied to the role — not marketing blurbs.

Return ONLY JSON matching the schema.
`.trim();

  const res = await callOpenAIJsonSchema<CharacterCasting>(
    prompt,
    buildCastingSuggestionsSchema(),
    {
      temperature: 0.6,
      max_tokens: 2500,
      request_tag: "casting",
      schema_name: "CastingSuggestions",
      model: MODEL_JSON_RAW,
    },
  );

  if (!res.data) return null;
  return { ...res.data, generatedAt: Date.now() };
};

// ============================================================
// VISION BOARD (PL-2 — director's vision board)
// 10 curated visual panels: cinematography + color palette +
// lighting + costume + production design + location. Each panel
// contains a craft-specific DALL-E prompt tuned for cinematic
// photorealism. Images are generated separately per-panel.
// ============================================================

export type VisionBoardCategory =
  | "cinematography"
  | "color_palette"
  | "lighting"
  | "costume"
  | "production_design"
  | "location";

export interface VisionBoardPrompt {
  id: string;                    // stable id for React keys and persistence
  category: VisionBoardCategory;
  title: string;                 // short label — "Rainy neon alley"
  description: string;           // 1-2 sentences on the visual intent
  imagePrompt: string;           // DALL-E 3 prompt (no text, photoreal, 400-800 chars)
  imageUrl?: string;             // filled after image generation
  generatedAt?: number;
}

export interface VisionBoard {
  prompts: VisionBoardPrompt[];
  generatedAt?: number;
}

function buildVisionBoardSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["prompts"],
    properties: {
      prompts: {
        type: "array",
        minItems: 10,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "category", "title", "description", "imagePrompt"],
          properties: {
            id: { type: "string" },
            category: {
              type: "string",
              enum: [
                "cinematography",
                "color_palette",
                "lighting",
                "costume",
                "production_design",
                "location",
              ],
            },
            title: { type: "string" },
            description: { type: "string" },
            imagePrompt: { type: "string" },
          },
        },
      },
    },
  };
}

export const generateVisionBoardPrompts = async (opts: {
  genre?: string;
  title?: string;
  logline?: string;
  synopsis?: string;
  themes?: string[];
  concept?: string;
  script?: string;
}): Promise<VisionBoard | null> => {
  const genre = (opts.genre || "drama").trim();
  const title = (opts.title || "Untitled").trim();
  const logline = (opts.logline || "").trim();
  const synopsis = (opts.synopsis || "").trim();
  const themes = Array.isArray(opts.themes) ? opts.themes.filter(Boolean) : [];
  const concept = (opts.concept || "").trim();
  const script = (opts.script || "").trim();

  if (!logline && !synopsis && !concept && !script) return null;

  const prompt = `
You are a senior cinematographer / production designer preparing a visual reference board ("lookbook") for "${title}" — a ${genre}. You speak the language of A24, Neon, Plan B: concrete, craft-specific, cinematic. No mood-board cliches.

${logline ? `LOGLINE: ${logline}\n` : ""}${synopsis ? `SYNOPSIS: ${synopsis}\n` : ""}${themes.length ? `THEMES: ${themes.join(", ")}\n` : ""}${concept ? `CONCEPT NOTE: ${concept}\n` : ""}${script ? `\nOPENING OF SCRIPT (voice calibration only):\n"""\n${tail(script, 3000)}\n"""\n` : ""}

Produce EXACTLY 10 vision-board panels covering the following distribution:
- 2 x "cinematography" (framing aesthetic — a hero composition and a contrasting one)
- 2 x "color_palette" (abstracted color language — the film's chromatic DNA, NOT a literal scene)
- 1 x "lighting" (signature lighting mood / ratio)
- 2 x "costume" (character aesthetic — wardrobe, texture, silhouette, detail)
- 2 x "production_design" (set / environment / props / architecture)
- 1 x "location" (the establishing world — the postcard shot)

For EACH panel, produce:

1. "id" — a short stable slug like "cine-01", "color-01", "costume-01", etc. Unique within this response.

2. "title" — 3-7 word human-readable label. Evocative, specific. "Rainy neon alley, backlit" beats "City night scene."

3. "description" — 1-2 sentences on the visual intent. What this panel is TELLING the viewer about tone, theme, or character. This is for the director/DP, not marketing.

4. "imagePrompt" — a DALL-E 3 prompt, 400-700 characters, engineered for cinematic photorealism:
   - Lead with the frame ("Cinematic still, [aspect ratio if relevant], ...")
   - Specify subject + environment + lighting + lens/focal length language
   - Reference concrete cinematography traditions when apt ("negative fill", "golden hour", "flat contrast with lifted blacks") but describe the quality — do NOT claim a specific named cinematographer or film did this shot.
   - For "color_palette" panels: describe an ABSTRACT color-field image, NOT a scene. E.g. "Abstract fog of crimson bleeding into charcoal, painterly texture, no figures, no text." Think Rothko, not narrative.
   - For "lighting": can be a scene but lighting must be the subject (ratio, motivated source, contrast)
   - For "costume" / "production design" / "location": favor photoreal, tactile, single focal subject
   - ALWAYS end with: "No text, no logos, no watermarks, photorealistic, 35mm film grain."
   - NEVER reference living celebrities, real brands, or copyrighted IP

CRAFT RULES:
- Every prompt must pass the "could I storyboard off this" test — specific enough to shoot.
- Vary angle, lens, time of day, and density across the 10 panels so the board has rhythm.
- Color palette panels are abstract color fields. Other panels are photoreal.
- DO NOT produce any prompt that could surface a person's face as a celebrity likeness — use descriptive features, not names.
- Keep prompts safe for DALL-E content policy: no gore, no minors in peril, no explicit content.

Return ONLY JSON matching the schema.
`.trim();

  const res = await callOpenAIJsonSchema<VisionBoard>(
    prompt,
    buildVisionBoardSchema(),
    {
      temperature: 0.7,
      max_tokens: 4500,
      request_tag: "vision-board",
      schema_name: "VisionBoard",
      model: MODEL_JSON_RAW,
    },
  );

  if (!res.data) return null;
  return { ...res.data, generatedAt: Date.now() };
};