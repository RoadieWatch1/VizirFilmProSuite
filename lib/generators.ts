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
    model: options.model || "gpt-4o",
    messages: [
      {
        role: "system",
        content: `
You are an expert film development AI.

**Example of screenplay format**:
FADE IN:

INT. COFFEE SHOP - DAY

JOHN, 30s, disheveled but charming, sips his coffee. The shop is bustling with PATRONS chatting. Sunlight streams through the windows, casting long shadows.

JOHN
(whispering to himself)
Another day, another dollar.

He spots MARY across the room, 20s, elegant, reading a book. He straightens up, heart racing.

JOHN (CONT'D)
Excuse me, is this seat taken?

MARY looks up, smiles faintly.

MARY
No, go ahead.

(Expand with more details as needed to fill length)

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
    model: options.model || "gpt-4o",
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
- Continue seamlessly. Do not restate prior scenes.
- Aim for the requested pages (1 page ≈ 220 words).
`,
      },
      { role: "user", content: prompt },
    ],
    temperature: options.temperature ?? 0.8,
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
      model: options.model || "gpt-4o",
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

/**
 * ✅ Robust runtime parsing
 * Accepts "120 min", "120m", "2h", "2 hours", "feature", etc.
 */
function parseLengthToMinutes(raw: string): number {
  if (!raw) return 5;
  const s = String(raw).trim().toLowerCase();

  const hrMatch = s.match(/(\d+)\s*(h|hr|hour|hours)\b/);
  if (hrMatch) {
    const h = parseInt(hrMatch[1], 10);
    if (!isNaN(h)) return Math.max(1, h * 60);
  }

  const numMatch = s.match(/(\d{1,3})/);
  if (numMatch) {
    const m = parseInt(numMatch[1], 10);
    if (!isNaN(m)) return Math.max(1, m);
  }

  if (s.includes("feature")) return 120;
  if (s.includes("short")) return 10;

  return 5;
}

function compactBeatsForPrompt(scenes: ShortScriptItem[], maxItems = 30) {
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

// ---------- Robust Outline helper ----------

type OutlineResult = {
  logline: string;
  synopsis: string;
  themes: string[];
  shortScript: ShortScriptItem[];
};

function computeSceneCap(targetPages: number, approxScenes: number) {
  // ✅ Feature-safe caps to prevent huge JSON (and truncation)
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

  const makeSummaryRule = (attempt: number) => {
    if (targetPages >= 90)
      return attempt <= 1
        ? "Keep each scene summary to 10–16 words (1 tight sentence)."
        : "Keep each scene summary to 8–14 words (very tight).";
    if (targetPages >= 60)
      return attempt <= 1
        ? "Keep each scene summary to 12–20 words (1–2 sentences)."
        : "Keep each scene summary to 10–16 words (tight).";
    if (targetPages >= 30)
      return attempt <= 1
        ? "Keep each scene summary to 18–30 words (2 sentences max)."
        : "Keep each scene summary to 14–24 words (tight).";
    return "Keep each scene summary to 35–60 words (2–4 sentences).";
  };

  // ---- Primary path: schema-locked full outline ----
  for (let attempt = 1; attempt <= 4; attempt++) {
    const sceneCap = Math.max(12, baseSceneCap - (attempt - 1) * 15);
    const summaryRule = makeSummaryRule(attempt);

    const prompt = `
Generate a compact but production-ready film outline for a ${genre} film based on this idea:
${idea}

Rules:
- 1 page ≈ 1 minute; target length ≈ ${targetPages} pages
- shortScript MUST be an array of exactly ${sceneCap} scenes.
- Each shortScript item must be:
  - act: 1, 2, or 3
  - sceneNumber: sequential starting at 1
  - heading: proper slug line like "INT. LOCATION - DAY" or "EXT. LOCATION - NIGHT"
  - summary: concise beat summary
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

    console.warn(
      `[getRobustOutline] attempt=${attempt} sceneCap=${sceneCap} finish_reason=${res.finish_reason} used_schema=${res.used_schema}`
    );
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
    const summaryRule = makeSummaryRule(2);

    const scenesPrompt = `
Using the act summaries below, produce EXACTLY ${sceneCap} shortScript scene beats.

Rules:
- sceneNumber sequential starting at 1
- Use proper headings like "INT. ... - DAY" / "EXT. ... - NIGHT"
- ${summaryRule}
- Act 2 is typically longest; distribute scenes realistically.
- Do not invent extra keys.

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

  // ---- Final fallback (should be rare now) ----
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

// ---------- GENERATORS ----------

export const generateScript = async (idea: string, genre: string, length: string) => {
  const duration = parseLengthToMinutes(length);
  const targetPages = duration; // 1 page ≈ 1 minute

  const approxScenes = Math.round(duration / 1.2);
  const minScenes = Math.max(3, Math.floor(approxScenes * 0.75));
  const maxScenes = Math.ceil(approxScenes * 1.25);

  let structureGuide = "";
  let numActs = 1;
  let numCharacters = 3;
  let synopsisLength = "150 words";

  if (duration <= 1) {
    structureGuide = "A very concise script with 1-2 scenes, minimal dialogue, focus on visual storytelling.";
    numCharacters = 1;
    synopsisLength = "50 words";
  } else if (duration <= 5) {
    structureGuide = "A short script with 3-5 scenes, concise dialogue, and clear setup/resolution.";
    numCharacters = 2;
    synopsisLength = "100 words";
  } else if (duration <= 10) {
    structureGuide = "A medium-short script with 6-8 scenes, basic character development, rising action, and resolution.";
    numActs = 3;
    numCharacters = 3;
    synopsisLength = "150 words";
  } else if (duration <= 15) {
    structureGuide = "A medium script with 8-12 scenes, full three-act structure, character development, and plot twists.";
    numActs = 3;
    numCharacters = 3;
    synopsisLength = "200 words";
  } else if (duration <= 30) {
    structureGuide =
      "A long script with 20-30 scenes, extensive character arcs, multiple subplots, and detailed world-building.";
    numActs = 3;
    numCharacters = 4;
    synopsisLength = "300 words";
  } else if (duration <= 60) {
    structureGuide =
      "A feature-length script with 40-60 scenes, detailed three-act structure, multiple storylines, deep character development, and thematic complexity.";
    numActs = 3;
    numCharacters = 5;
    synopsisLength = "400 words";
  } else {
    structureGuide =
      "A full feature film with 80-120 scenes, extended three-act structure, complex subplots, ensemble cast, and thematic depth.";
    numActs = 3;
    numCharacters = 7;
    synopsisLength = "500 words";
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
`;

  // ---------- Short scripts (<= 15 min): meta JSON + plain-text script ----------
  if (duration <= 15) {
    const metaPrompt = `${basePrompt}
Output JSON with ONLY:
- logline
- synopsis: ${synopsisLength}
- themes: Array of 3-5 themes
- shortScript: Array of scene objects with {scene, description, dialogue}
`;
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
`;
    const { content: scriptText } = await callOpenAIText(writePrompt, { temperature: 0.8, max_tokens: 4096 });

    return {
      logline: meta.logline,
      synopsis: meta.synopsis,
      scriptText: scriptText.trim(),
      shortScript: meta.shortScript || [],
      themes: meta.themes || [],
    };
  }

  // ---------- Medium/Long scripts: outline as JSON, writing as text chunks ----------
  const outlineParsed = await getRobustOutline({
    idea,
    genre,
    targetPages,
    approxScenes,
    synopsisLength,
  });
  const shortScript: ShortScriptItem[] = outlineParsed.shortScript || [];

  const wordsPerPage = 220;

  /**
   * ✅ Step 2: Speed + 300s timeout protection
   * Use larger chunks for feature scripts to reduce total OpenAI calls.
   */
  const pagesPerChunk =
    targetPages >= 110 ? 12 :
    targetPages >= 90 ? 11 :
    targetPages >= 60 ? 10 :
    targetPages >= 35 ? 7 :
    6;

  const numChunks = Math.ceil(targetPages / pagesPerChunk);

  // Max tokens: larger for features to get more pages per call.
  const chunkMaxTokens = targetPages >= 60 ? 8192 : 4096;

  // Vercel hard timeout is 300s; we stop earlier to return JSON safely.
  const HARD_TIME_LIMIT_MS = 260_000;
  const startedAt = Date.now();
  const timeOk = () => Date.now() - startedAt < HARD_TIME_LIMIT_MS;

  let scriptFountain = "";
  let pageEstimate = 0;
  let chunkIndex = 0;
  let previousChunkTail = "";

  // Base on actual outline length (Step 1 caps scenes)
  const effectiveScenes = Math.max(1, shortScript.length || approxScenes);

  // Very strict loop bound for speed
  const maxChunkLoops = Math.min(numChunks + 2, 20);

  while (timeOk() && pageEstimate < targetPages - 2 && chunkIndex < maxChunkLoops) {
    const startScene = Math.floor(chunkIndex * (effectiveScenes / numChunks)) + 1;
    const endScene = Math.min(
      Math.floor((chunkIndex + 1) * (effectiveScenes / numChunks)),
      effectiveScenes
    );
    const chunkScenes = shortScript.slice(startScene - 1, endScene);

    const beats = compactBeatsForPrompt(chunkScenes, 35);

    const isStart = !previousChunkTail;

    // Smaller context tail for features = faster + fewer prompt tokens
    const contextTail = previousChunkTail || "(Script start)";

    const continuationPrompt = `
Write approximately ${pagesPerChunk} pages of screenplay in **Fountain format**.
1 page ≈ ${wordsPerPage} words. Output screenplay text ONLY.

${isStart ? `Start from scratch. Include "FADE IN:" and the first scene heading.` : `Continue seamlessly from the prior text.`}

Enforcement:
- Slug lines often (INT./EXT.)
- NEVER go ~350–450 words without a new slug line
- Keep scenes readable + countable for production
- No summaries, no commentary, no JSON

Chunk target:
- Start around scene ${startScene} and continue through scene ${endScene}
- If you finish early, continue logically into the next beats.

RECENT CONTEXT:
${contextTail}

BEATS (follow these in order, expand into full scenes):
${beats}
`.trim();

    const chunk = await callOpenAIText(continuationPrompt, {
      temperature: 0.82,
      max_tokens: chunkMaxTokens,
    });

    const chunkText = (chunk.content || "").trim();
    if (!chunkText) break;

    scriptFountain += (scriptFountain ? "\n\n" : "") + chunkText;
    pageEstimate = estimatePagesFromText(scriptFountain, wordsPerPage);

    // Smaller tail for speed + prevents huge prompts
    previousChunkTail = tail(scriptFountain, targetPages >= 60 ? 2200 : 4000);
    chunkIndex++;

    // Safety: avoid massive overshoot
    if (pageEstimate > targetPages + 10) break;
  }

  /**
   * ✅ Step 2: Controlled expansion (few calls max)
   * Fill missing pages without many tiny calls.
   */
  let guardPass = 0;
  const minTarget = Math.round(targetPages * 0.92);

  while (timeOk() && pageEstimate < minTarget && guardPass < 3) {
    const remaining = targetPages - pageEstimate;

    const addPages =
      targetPages >= 110 ? Math.min(14, Math.max(8, Math.round(remaining * 0.55))) :
      targetPages >= 60 ? Math.min(12, Math.max(7, Math.round(remaining * 0.55))) :
      Math.min(10, Math.max(5, Math.round(remaining * 0.5)));

    const expansionPrompt = `
Continue the screenplay from the RECENT CONTEXT below.
Write ~${addPages} more pages in Fountain format.

Add:
- connective scenes that bridge beats naturally
- richer dialogue with subtext
- character moments that deepen arcs
- escalation of stakes and consequences

Rules:
- No contradictions
- No summaries
- Keep slug lines frequent

RECENT CONTEXT:
${previousChunkTail}
`.trim();

    const expansion = await callOpenAIText(expansionPrompt, {
      temperature: 0.86,
      max_tokens: chunkMaxTokens,
    });

    const addText = (expansion.content || "").trim();
    if (!addText) break;

    scriptFountain += "\n\n" + addText;
    pageEstimate = estimatePagesFromText(scriptFountain, wordsPerPage);
    previousChunkTail = tail(scriptFountain, targetPages >= 60 ? 2200 : 4000);
    guardPass++;
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
