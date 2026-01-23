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

// Optional model overrides (keeps defaults if unset)
const MODEL_TEXT = process.env.OPENAI_MODEL_TEXT || "gpt-4o";
const MODEL_JSON = process.env.OPENAI_MODEL_JSON || "gpt-4o";

// ---------- Helpers for OpenAI calls ----------

type ChatOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  // forward-compatible extras
  [key: string]: any;
};

async function callOpenAI(
  prompt: string,
  options: ChatOptions = {}
): Promise<{ content: string; finish_reason: string }> {
  // JSON-oriented helper (use for outlines, budgets, etc.)
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: options.model || MODEL_JSON,
    messages: [
      {
        role: "system",
        content: `
You are an expert film development AI.

**When generating scripts**, produce JSON like:
{
  "logline": "...",
  "synopsis": "...",
  "scriptText": "...",
  "shortScript": [ ... ],
  "themes": ["...", "..."]
}

- scriptText must be a professional screenplay in correct screenplay format:
  • SCENE HEADINGS (e.g. INT. FOREST - DAY)
  • Action lines in present tense
  • Character names uppercase and centered
  • Dialogue indented under character names
  • No camera directions or lenses
  • Strictly adhere to specified page, scene, and character counts

**When generating storyboards**, produce JSON like:
{
  "storyboard": [
    {
      "scene": "...",
      "shotNumber": "...",
      "description": "...",
      "cameraAngle": "...",
      "cameraMovement": "...",
      "lens": "...",
      "lighting": "...",
      "duration": "...",
      "dialogue": "...",
      "soundEffects": "...",
      "notes": "...",
      "imagePrompt": "...",
      "imageUrl": "",
      "coverageShots": [ ... ]
    }
  ]
}

Always fill imagePrompt with a short visual description. Leave imageUrl empty.

**When generating concepts**, produce:
{
  "concept": {
    "visualStyle": "...",
    "colorPalette": "...",
    "cameraTechniques": "...",
    "lightingApproach": "...",
    "thematicSymbolism": "...",
    "productionValues": "..."
  },
  "visualReferences": [
    {
      "description": "...",
      "imageUrl": "https://..."
    }
  ]
}

**When generating characters**, produce:
{
  "characters": [
    {
      "name": "...",
      "role": "...",
      "description": "...",
      "traits": ["...", "..."],
      "skinColor": "...",
      "hairColor": "...",
      "clothingColor": "...",
      "mood": "...",
      "visualDescription": "...",
      "imageUrl": ""
    }
  ]
}

**When generating locations**, produce:
{
  "locations": [
    {
      "name": "...",
      "type": "...",
      "description": "...",
      "scenes": ["...", "..."],
      "rating": 4.5,
      "cost": "$...",
      "lowBudgetTips": "...",
      "highBudgetOpportunities": "...",
      "features": ["...", "..."]
    }
  ]
}

**When generating sound assets**, produce:
{
  "soundAssets": [
    {
      "name": "...",
      "type": "...",
      "duration": "...",
      "description": "...",
      "scenes": ["...", "..."],
      "audioUrl": ""
    }
  ]
}

Always produce valid JSON without extra commentary or markdown (e.g., no \`\`\`json).
`,
      },
      { role: "user", content: prompt },
    ],
    temperature: options.temperature ?? 0.7,
    response_format: { type: "json_object" },
    max_tokens: options.max_tokens ?? 4096,
    ...options,
  });

  let content = completion.choices[0].message.content ?? "";
  content = content.trim();
  if (content.startsWith("```json")) content = content.slice(7);
  if (content.endsWith("```")) content = content.slice(0, -3);

  return {
    content: content.trim(),
    finish_reason: completion.choices[0].finish_reason || "stop",
  };
}

async function callOpenAIText(
  prompt: string,
  options: ChatOptions = {}
): Promise<{ content: string; finish_reason: string }> {
  // Text-only helper (use for screenplay chunks). No JSON formatting pressure.
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
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
- Continue seamlessly.
`,
      },
      { role: "user", content: prompt },
    ],
    temperature: options.temperature ?? 0.85, // Higher temp for more creative expansion
    max_tokens: options.max_tokens ?? 4096,
    ...options,
  });

  const msg = completion.choices[0].message;
  return {
    content: (msg.content ?? "").trim(),
    finish_reason: completion.choices[0].finish_reason || "stop",
  };
}

/**
 * ✅ Structured Outputs helper for schema-locked JSON (used ONLY for outlines).
 * Falls back to older JSON mode if schema format is not supported (or throws).
 */
async function callOpenAIJsonSchema<T>(
  prompt: string,
  jsonSchema: any,
  options: ChatOptions = {}
): Promise<{ data: T | null; content: string; finish_reason: string; used_schema: boolean }> {
  const openai = getOpenAI();

  const messages = [
    {
      role: "system" as const,
      content:
        "You are an expert film development AI. Return ONLY valid JSON that conforms to the provided schema. No extra keys. No markdown.",
    },
    { role: "user" as const, content: prompt },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: options.model || MODEL_JSON,
      messages,
      temperature: options.temperature ?? 0.35,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "FilmOutline",
          schema: jsonSchema,
          strict: true,
        },
      },
      max_tokens: options.max_tokens ?? 4500,
      ...options,
    });

    let content = completion.choices[0].message.content ?? "";
    content = content.trim();
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.endsWith("```")) content = content.slice(0, -3);

    const data = safeParse<T>(content, "outline-json_schema");
    return {
      data,
      content: content.trim(),
      finish_reason: completion.choices[0].finish_reason || "stop",
      used_schema: true,
    };
  } catch (err) {
    // Fallback: JSON mode
    const { content, finish_reason } = await callOpenAI(prompt, {
      ...options,
      temperature: options.temperature ?? 0.35,
      max_tokens: options.max_tokens ?? 4500,
    });
    const data = safeParse<T>(content, "outline-json_object-fallback");
    return { data, content, finish_reason, used_schema: false };
  }
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

function estimatePagesFromText(text: string, wordsPerPage = 220) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerPage));
}

function tail(text: string, maxChars = 4000) {
  if (!text) return "";
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

function safeParse<T = any>(raw: string, tag = "json"): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    const i = raw.indexOf("{");
    const j = raw.lastIndexOf("}");
    if (i >= 0 && j > i) {
      try {
        return JSON.parse(raw.slice(i, j + 1)) as T;
      } catch {}
    }
    console.error(`safeParse failed [${tag}] len=${raw?.length}`, e);
    return null;
  }
}

function parseLengthToMinutes(raw: string): number {
  if (!raw) return 5;
  const s = String(raw).trim().toLowerCase();

  if (s.includes("feature")) return 120;
  if (s.includes("short")) return 10;

  // HH:MM
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

function compactBeatsForPrompt(scenes: ShortScriptItem[], maxItems = 24) {
  if (!scenes?.length) return "(No beats available for this chunk.)";
  const slice = scenes.slice(0, maxItems);
  const lines = slice.map((s) => {
    const n = typeof s.sceneNumber === "number" ? s.sceneNumber : "";
    const a = typeof s.act === "number" ? s.act : "";
    const h = String(s.heading || "").trim();
    const sum = String(s.summary || "").trim();
    return `#${n} (Act ${a}) ${h} — ${sum}`;
  });
  if (scenes.length > maxItems) {
    lines.push(`...and ${scenes.length - maxItems} more beats in this chunk.`);
  }
  return lines.join("\n");
}

function stripExtraFadeIn(text: string) {
  // Find the first FADE IN / FADE IN:
  const firstMatch = /\bFADE IN:?\b/.exec(text);
  
  // If not found, return original
  if (!firstMatch) return text.trim();

  // If found, keep everything up to the end of the first match
  const index = firstMatch.index;
  const length = firstMatch[0].length;
  const endOfFirst = index + length;

  const head = text.slice(0, endOfFirst);
  // Remove all subsequent occurrences from the rest of the text
  const tail = text.slice(endOfFirst).replace(/\bFADE IN:?\b/g, "");

  return (head + tail).trim();
}

// Helper: Stagger requests to avoid 429 Rate Limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ---------- Robust Outline helper ----------

type OutlineResult = {
  logline: string;
  synopsis: string;
  themes: string[];
  shortScript: ShortScriptItem[];
};

function computeSceneCap(targetPages: number, approxScenes: number) {
  let cap = approxScenes;

  if (targetPages >= 110) cap = Math.min(approxScenes, 85);
  else if (targetPages >= 90) cap = Math.min(approxScenes, 80);
  else if (targetPages >= 60) cap = Math.min(approxScenes, 70);
  else if (targetPages >= 30) cap = Math.min(approxScenes, 60);
  else cap = Math.min(approxScenes, 45);

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
  });

  return repaired.data;
}

async function getRobustOutline(params: {
  idea: string;
  genre: string;
  targetPages: number;
  approxScenes: number;
  synopsisLength: string;
}): Promise<OutlineResult> {
  const { idea, genre, targetPages, approxScenes, synopsisLength } = params;

  const baseSceneCap = computeSceneCap(targetPages, approxScenes);

  // ✅ Force longer, more descriptive summaries to prevent "lazy" scene generation
  const summaryRule = "Make scene summaries detailed (25-45 words) to guide the writer.";

  // ---- Primary path: schema-locked full outline ----
  for (let attempt = 1; attempt <= 4; attempt++) {
    const sceneCap = Math.max(12, baseSceneCap - (attempt - 1) * 15);
    
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
  - summary: DETAILED action beat (25-45 words).
- ${summaryRule}
- Themes: 3–5 items.

Synopsis length target: ${synopsisLength}
`.trim();

    const schema = buildOutlineSchema(sceneCap);
    const res = await callOpenAIJsonSchema<OutlineResult>(prompt, schema, {
      temperature: 0.35,
      max_tokens: 4500,
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

    if (!parsed && res.content && res.content.length > 50) {
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

  // ---- Fallback path: acts -> scenes (both schema-locked) ----
  const actSummaryWords = targetPages >= 60 ? "120–160 words" : "180–220 words";

  const actPrompt = `
Create act-level summaries for a ${genre} film from this idea:
${idea}

Constraints:
- 3 acts only.
- Act summaries should be ${actSummaryWords}.
- Themes 3–5 items.
- Synopsis target length: ${synopsisLength}.
`.trim();

  const actsRes = await callOpenAIJsonSchema<{
    logline: string;
    synopsis: string;
    themes: string[];
    acts: { act: number; summary: string }[];
  }>(actPrompt, buildActsSchema(), { temperature: 0.3, max_tokens: 2400 });

  const actsParsed = actsRes.data;

  if (actsParsed?.acts?.length === 3) {
    const sceneCap = baseSceneCap;
    
    const scenesPrompt = `
Using the act summaries below, produce EXACTLY ${sceneCap} shortScript scene beats.

Rules:
- sceneNumber sequential starting at 1
- Use proper headings like "INT. ... - DAY"
- Provide detailed summaries (25-40 words each) for the writer.
- Act 2 is typically longest; distribute scenes realistically.

ACTS_JSON:
${JSON.stringify(actsParsed)}
`.trim();

    const scenesRes = await callOpenAIJsonSchema<{ shortScript: ShortScriptItem[] }>(
      scenesPrompt,
      buildScenesOnlySchema(sceneCap),
      { temperature: 0.28, max_tokens: 3600 }
    );

    if (scenesRes.data?.shortScript?.length === sceneCap) {
      const normalized = scenesRes.data.shortScript.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
      return {
        logline: actsParsed.logline || "",
        synopsis: actsParsed.synopsis || "",
        themes: actsParsed.themes || [],
        shortScript: normalized,
      };
    }
  }

  // ---- Final fallback ----
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
  startState: string; // what MUST already be true at the start of this chunk
  endState: string; // what MUST be true at the end of this chunk
  mustInclude: string[]; // concrete requirements (events/reveals/turns)
  mustAvoid: string[]; // prevent contradictions + repetition
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
  });

  if (res.data?.chunks?.length === chunks.length) return res.data.chunks;
  return null;
}

// ---------- GENERATORS ----------

export const generateScript = async (idea: string, genre: string, length: string) => {
  const duration = parseLengthToMinutes(length);
  const targetPages = duration; // 1 page ≈ 1 minute

  // Adjust scene counts based on pacing (High density for features)
  const approxScenes = Math.round(duration); // 1 scene per minute
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
  // Sequential is fine here because it's fast.
  if (duration <= 15) {
    const metaPrompt = `${basePrompt}
Output JSON with ONLY:
- logline
- synopsis: ${synopsisLength}
- themes: Array of 3-5 themes
- shortScript: Array of scene objects with {scene, description, dialogue}
`.trim();

    const { content: metaJson } = await callOpenAI(metaPrompt, { temperature: 0.6, max_tokens: 2200 });
    const meta = safeParse(metaJson, "short-meta") ?? { logline: "", synopsis: "", themes: [], shortScript: [] };

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

    const { content: scriptText } = await callOpenAIText(writePrompt, { temperature: 0.82, max_tokens: 4096 });

    return {
      logline: meta.logline,
      synopsis: meta.synopsis,
      scriptText: scriptText.trim(),
      shortScript: meta.shortScript || [],
      themes: meta.themes || [],
    };
  }

  // --- PATH B: Feature scripts (Parallel chunk writing) ---

  // 1) Outline (schema-locked)
  const outlineParsed = await getRobustOutline({
    idea,
    genre,
    targetPages,
    approxScenes,
    synopsisLength,
  });

  const shortScript: ShortScriptItem[] = outlineParsed.shortScript || [];
  const effectiveScenes = Math.max(1, shortScript.length || approxScenes);

  // 2) Choose a SAFE number of parallel chunks
  // We need chunks small enough to be dense, but few enough to fit in limits.
  const chunkCount =
    targetPages <= 45 ? 3 :
    targetPages <= 70 ? 4 :
    targetPages <= 95 ? 5 :
    6;

  // ✅ SAFETY CHECK: Ensure we don't have more chunks than scenes
  const safeChunkCount = Math.min(chunkCount, effectiveScenes);
  const pagesPerChunk = Math.ceil(targetPages / safeChunkCount);
  
  // ✅ WORD COUNT TARGET (Important for forcing length)
  const targetWords = pagesPerChunk * 250; // 250 words per page to force density

  // Tokens needed per chunk (rough estimate)
  const maxTokensPerChunk = clamp(Math.round(targetWords * 1.5), 5000, 14000);

  // 3) Build chunk scene ranges (even distribution)
  const chunkRanges = Array.from({ length: safeChunkCount }, (_, idx) => {
    const startScene = Math.floor(idx * (effectiveScenes / safeChunkCount)) + 1;
    const endScene = Math.min(Math.floor((idx + 1) * (effectiveScenes / safeChunkCount)), effectiveScenes);
    return { part: idx + 1, startScene, endScene };
  }).filter((r) => r.endScene >= r.startScene);

  const chunkInputs = chunkRanges.map((r) => {
    const chunkScenes = shortScript.slice(r.startScene - 1, r.endScene);
    // We allow more beats here because we *don't* have previousChunkTail in parallel.
    const beats = compactBeatsForPrompt(chunkScenes, 44);
    return { ...r, beats };
  });

  // 4) Create continuity constraints for each chunk (fast JSON call)
  const plans = await getChunkPlans({
    idea,
    genre,
    targetPages,
    outline: outlineParsed,
    chunks: chunkInputs,
  });

  // 5) Parallel generation with STAGGERING to avoid rate limits
  const chunkPromises = chunkInputs.map(async (chunk, index) => {
    // ✅ Stagger requests by 1.5s to prevent 429 Too Many Requests
    await delay(index * 1500);

    const isStart = index === 0;
    const plan = plans?.[index];

    const chunkPrompt = `
Write PART ${chunk.part} of ${chunkInputs.length} of a feature screenplay in **Fountain** format.

GLOBAL CONTEXT:
Genre: ${genre}
Logline: ${outlineParsed.logline}
Synopsis: ${outlineParsed.synopsis}
Themes: ${(outlineParsed.themes || []).slice(0, 6).join(", ")}

TARGET:
- Write exactly ${targetWords} words (~${pagesPerChunk} pages).
- Cover scenes #${chunk.startScene} through #${chunk.endScene}.
- EXPAND the beats. Do not summarize. Write full dialogue and detailed action.

FORMAT RULES:
- ${isStart ? 'Include "FADE IN:" exactly once at the very start.' : 'Do NOT include "FADE IN:". Start with the first scene heading.'}
- Use slug lines frequently.
- Action in present tense.

${plan ? `CONTINUITY CONSTRAINTS:
START STATE: ${plan.startState}
END STATE: ${plan.endState}
MUST INCLUDE: ${(plan.mustInclude || []).join(", ")}
MUST AVOID: ${(plan.mustAvoid || []).join(", ")}
` : ""}

BEATS TO EXPAND:
${chunk.beats}
`.trim();

    const { content } = await callOpenAIText(chunkPrompt, {
      temperature: 0.85, // Creative freedom
      max_tokens: maxTokensPerChunk,
    });

    return (content || "").trim();
  });

  const generatedChunks = await Promise.all(chunkPromises);

  // 6) Stitch + sanitize (remove duplicate FADE IN if a later chunk slipped it in)
  const stitched = generatedChunks.filter(Boolean).join("\n\n");
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
For each character, include:
- name
- role (protagonist, antagonist, etc.)
- description (physical appearance, age, background)
- traits (array of 3-5 personality traits)
- skinColor (e.g., fair, olive)
- hairColor (e.g., blonde, black)
- clothingColor (dominant outfit colors)
- mood (overall emotional state)
- visualDescription (detailed for AI image generation)
- imageUrl (empty string)

Return a JSON object with key "characters" containing the array.
`;

  const { content } = await callOpenAI(prompt, { temperature: 0.5 });
  const parsed = safeParse<{ characters: any[] }>(content, "characters");
  return { characters: parsed?.characters || [] };
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

Full Script:
${script}

Characters:
${JSON.stringify(characters)}

Specifications:
- Exactly ${numFrames} main frames
- Each main frame includes ${coveragePerFrame} coverage shots
- Total shots: ${numFrames * (coveragePerFrame + 1)}
- Distribute evenly across script scenes
- For each frame/shot:
  - scene: Scene heading from script
  - shotNumber: Sequential (e.g., 1A, 1B)
  - description: Visual action
  - cameraAngle
  - cameraMovement
  - lens
  - lighting
  - duration (seconds)
  - dialogue (if any)
  - soundEffects
  - notes
  - imagePrompt (for AI generation)
  - imageUrl (empty)

Return JSON with key "storyboard" containing array of main frames, each with coverageShots array.
`;

  const { content } = await callOpenAI(prompt, { temperature: 0.6 });
  const parsed = safeParse<{ storyboard: StoryboardFrame[] }>(content, "storyboard");
  return parsed?.storyboard || [];
};

// ---------- Concept ----------

export const generateConcept = async (script: string, genre: string) => {
  const prompt = `
Based on this ${genre} film script:
${script}

Generate a visual concept including:
- concept object with visualStyle, colorPalette, cameraTechniques, lightingApproach, thematicSymbolism, productionValues
- visualReferences: array of 3-5 objects with description and imageUrl (real URLs to reference images)

Return the JSON object directly.
`;

  const { content } = await callOpenAI(prompt, { temperature: 0.7 });
  const parsed = safeParse<{ concept: any; visualReferences: any[] }>(content, "concept");
  return {
    concept: parsed?.concept || {},
    visualReferences: parsed?.visualReferences || [],
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

  const prompt = `
Generate a detailed film budget breakdown for a ${genre} film of ${length} length.
Total estimated budget: $${Math.round(baseBudget * genreMultiplier)}

Categories:
- Pre-Production (script, casting)
- Production (crew, equipment, locations)
- Post-Production (editing, sound, VFX)
- Marketing/Distribution

For each category:
- name
- amount
- percentage (of total)
- items (array of sub-items with costs)
- tips (array of budget tips)
- alternatives (low-cost options)

Return JSON with key "categories" containing the array.
`;

  const { content } = await callOpenAI(prompt, { temperature: 0.4 });
  const parsed = safeParse(content, "budget") || { categories: [] };
  return parsed;
};

// ---------- Schedule ----------

export const generateSchedule = async (script: string, length: string) => {
  const prompt = `
Given this film script:
${script}

Generate a shooting schedule for a film of length ${length}.
For each day, include:
- day name
- activities (array of strings)
- duration
- location (optional)
- crew list (optional)

Return a JSON object with key "schedule" containing the array.
`;

  const { content } = await callOpenAI(prompt, { temperature: 0.5 });
  const parsed = safeParse<{ schedule: any[] }>(content, "schedule");
  return { schedule: parsed?.schedule || [] };
};

// ---------- Locations ----------

export const generateLocations = async (script: string, genre: string) => {
  const fallbackScript = `
A ${genre || "generic"} film featuring a protagonist navigating several dramatic locations:
- An abandoned warehouse full of shadows and secrets.
- Rainy neon-lit city streets at night.
- A dramatic rooftop showdown above a glowing skyline.
`;

  const usedScript = script && script.trim().length > 0 ? script : fallbackScript;

  const prompt = `
You are a professional film location scout.

Analyze the following film script and extract ALL distinct filming locations based on scene headings and descriptions.

SCRIPT:
"""START_SCRIPT"""
${usedScript}
"""END_SCRIPT"""

RULES:
- Use only actual locations from the script (e.g., "EXT. PARK ENTRANCE - LATER").
- Do NOT invent generic names like "Primary Location".
- NEVER leave any field blank or use "N/A".
- If script lacks details, create plausible cinematic descriptions using the script's location names.
- Each location must include:
  - name (from scene heading)
  - type (Interior or Exterior)
  - description (visual and atmospheric details)
  - mood (emotional tone)
  - colorPalette (key visual tones/colors)
  - propsOrFeatures (array of objects or environmental features)
  - scenes (short summary of events)
  - rating (1–5 for visual impact)
  - lowBudgetTips (how to recreate affordably)
  - highBudgetOpportunities (how to elevate production design)

Return a JSON object with key "locations" containing the array of location objects.
`;

  const { content } = await callOpenAI(prompt, { temperature: 0.5 });
  const parsed = safeParse<{ locations: any[] }>(content, "locations");
  return { locations: parsed?.locations || [] };
};

// ---------- Sound Assets ----------

export const generateSoundAssets = async (script: string, genre: string) => {
  // Keeping your current behavior for now (you said focus on script quality first).
  const duration = parseInt(script.match(/\d+/)?.[0] || "5", 10);
  const numAssets = duration <= 15 ? 5 : duration <= 60 ? 8 : 15;

  const prompt = `
Given this film script:
${script}

Generate exactly ${numAssets} sound assets for a ${genre} film, each with:
- name (unique and descriptive, reflecting the asset's purpose)
- type (music, sfx, dialogue, ambient)
- duration (minimum 10 seconds, up to 1:00 for features, formatted as "MM:SS")
- description (highly detailed, vivid, at least 50 words, for AI audio generation, including specific elements, tones, intensities, and scene enhancement)
- scenes (array of scene names matching script headings)
- audioUrl (empty string)

Ensure assets align with the script's scenes and tone.
Return a JSON object with key "soundAssets" containing the array of sound asset objects.
`;

  const { content } = await callOpenAI(prompt, { temperature: 0.5 });
  const parsed = safeParse<{ soundAssets: any[] }>(content, "soundAssets");
  let soundAssets: any[] = parsed?.soundAssets || [];

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