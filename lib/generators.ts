// C:\Users\vizir\VizirPro\lib\generators.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Helpers for OpenAI calls ----------

async function callOpenAI(
  prompt: string,
  options: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming> = {}
): Promise<{ content: string; finish_reason: string }> {
  // JSON-oriented helper (use for outlines, budgets, etc.)
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
  return { content: content.trim(), finish_reason: completion.choices[0].finish_reason || "stop" };
}

async function callOpenAIText(
  prompt: string,
  options: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming> = {}
): Promise<{ content: string; finish_reason: string }> {
  // Text-only helper (use for screenplay chunks). No JSON formatting pressure.
  const completion = await openai.chat.completions.create({
    model: options.model || "gpt-4o",
    messages: [
      {
        role: "system",
        content: `
You are a professional screenwriter. Output ONLY screenplay text in **Fountain** format.
- Use SCENE HEADINGS (INT./EXT. LOCATION - DAY/NIGHT).
- Action lines in present tense, concise.
- CHARACTER names uppercase; dialogue indented under names.
- No summaries, no analysis, no JSON, no commentary.
- Continue the story seamlessly. Do not restate prior scenes.
- Aim for approximately the requested number of pages (1 page ≈ 220 words).
`,
      },
      { role: "user", content: prompt },
    ],
    temperature: options.temperature ?? 0.8,
    max_tokens: options.max_tokens ?? 3500,
  });

  const msg = completion.choices[0].message;
  return { content: (msg.content ?? "").trim(), finish_reason: completion.choices[0].finish_reason || "stop" };
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
 * ✅ Robust runtime parsing (fixes "2 hours" -> 2 minutes bug)
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

// ---------- Robust Outline helper ----------

type OutlineResult = {
  logline: string;
  synopsis: string;
  themes: string[];
  shortScript: ShortScriptItem[];
};

async function getRobustOutline(params: {
  idea: string;
  genre: string;
  targetPages: number;
  approxScenes: number;
  synopsisLength: string;
}): Promise<OutlineResult> {
  const { idea, genre, targetPages, approxScenes, synopsisLength } = params;

  // ✅ Features need more scenes available; also keep a floor so short scripts aren’t too tiny
  const SCENE_CAP = Math.max(12, Math.min(approxScenes, 120));

  // ✅ Scene-summary size must shrink for features or the JSON outline gets truncated
  const summaryRule =
    targetPages >= 90 ? "Keep each scene summary to 12–20 words (1–2 tight sentences)."
    : targetPages >= 60 ? "Keep each scene summary to 15–25 words (1–2 sentences)."
    : targetPages >= 30 ? "Keep each scene summary to 25–45 words (2–3 sentences)."
    : "Keep each scene summary to 50–80 words.";

  const base = `
Generate a compact but production-ready film outline for a ${genre} film based on this idea:
${idea}

Rules:
- 1 page ≈ 1 minute; target length ≈ ${targetPages} pages
- Output STRICT JSON only. No markdown. No commentary.
- ${summaryRule}
- Use only these keys at top level: logline, synopsis, themes, shortScript
- shortScript MUST be an array of exactly ${SCENE_CAP} scenes.
- Each scene object MUST have: { "act": number, "sceneNumber": number, "heading": "INT/EXT. LOCATION - DAY/NIGHT", "summary": "..." }
- Do NOT include any other keys.
`;

  // Attempt A — single-pass compact outline
  const promptA = `${base}
Output JSON:
{
  "logline": "1 sentence",
  "synopsis": "${synopsisLength}",
  "themes": ["3-5 thematic words/phrases"],
  "shortScript": [
    { "act": 1, "sceneNumber": 1, "heading": "INT. ... - DAY", "summary": "..." }
    // ... exactly ${SCENE_CAP} items
  ]
}
`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { content } = await callOpenAI(promptA, {
      temperature: 0.45,
      max_tokens: 3500,
    });
    const parsed = safeParse<OutlineResult>(content, `outline-A#${attempt}`);
    if (parsed?.shortScript?.length === SCENE_CAP) return parsed;
    if (parsed?.shortScript?.length) {
      // Accept partial if model under-produced; we’ll still be able to write from it.
      return parsed;
    }
  }

  // Attempt B — two-step: acts -> scenes (more reliable for feature-length outlines)
  const actSummaryWords = targetPages >= 60 ? "120–160 words" : "180–220 words";

  const actPrompt = `
Create STRICT JSON with only:
{
  "logline": "1 sentence",
  "synopsis": "${synopsisLength}",
  "themes": ["3-5"],
  "acts": [
    { "act": 1, "summary": "${actSummaryWords}" },
    { "act": 2, "summary": "${actSummaryWords}" },
    { "act": 3, "summary": "${actSummaryWords}" }
  ]
}
Idea: ${idea}
Genre: ${genre}
Target pages: ${targetPages}
`;

  const actRes = await callOpenAI(actPrompt, { temperature: 0.45, max_tokens: 2200 });
  const actsParsed = safeParse<{
    logline: string;
    synopsis: string;
    themes: string[];
    acts: { act: number; summary: string }[];
  }>(actRes.content, "outline-acts");

  if (actsParsed?.acts?.length) {
    const scenePrompt = `
Using these act summaries, output STRICT JSON with only:
{
  "shortScript": [
    { "act": 1, "sceneNumber": 1, "heading": "INT. ... - DAY", "summary": "..." }
    // ... exactly ${SCENE_CAP} items across acts
  ]
}

Rules:
- ${summaryRule}
- Ensure sceneNumber increments sequentially from 1.
- Act distribution should feel natural (Act 2 typically longest).
- No extra keys.

${JSON.stringify(actsParsed, null, 2)}
`;
    const sceneRes = await callOpenAI(scenePrompt, { temperature: 0.4, max_tokens: 3500 });
    const sceneParsed = safeParse<{ shortScript: ShortScriptItem[] }>(sceneRes.content, "outline-scenes");
    if (sceneParsed?.shortScript?.length) {
      return {
        logline: actsParsed.logline || "",
        synopsis: actsParsed.synopsis || "",
        themes: actsParsed.themes || [],
        shortScript: sceneParsed.shortScript,
      };
    }
  }

  // Attempt C — minimal fallback so generation can proceed
  const minimal: OutlineResult = {
    logline: "",
    synopsis: "",
    themes: [],
    shortScript: Array.from({ length: Math.max(12, Math.min(40, SCENE_CAP)) }, (_, i) => ({
      act: i < 4 ? 1 : i < 8 ? 2 : 3,
      sceneNumber: i + 1,
      heading: i % 2 === 0 ? "INT. LOCATION - DAY" : "EXT. LOCATION - NIGHT",
      summary: "To be expanded during writing. Maintain continuity and escalate stakes.",
    })),
  };
  return minimal;
}

// ---------- GENERATORS ----------

export const generateScript = async (idea: string, genre: string, length: string) => {
  // ✅ Robust parse (prevents “2 hours” becoming 2 minutes)
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
    structureGuide = "A long script with 20-30 scenes, extensive character arcs, multiple subplots, and detailed world-building.";
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
- Style: Use a highly verbose, detailed writing style. Expand action lines with environmental detail, emotions, and sensory specifics. Extend dialogue with subtext and natural back-and-forth. Do not summarize.
`;

  // ---------- Short scripts (<= 15 min): meta JSON + plain-text script ----------
  if (duration <= 15) {
    // A) compact JSON meta (no big script inside JSON)
    const metaPrompt = `${basePrompt}
Output JSON with ONLY:
- logline
- synopsis: ${synopsisLength}
- themes: Array of 3-5 themes
- shortScript: Array of scene objects with {scene, description, dialogue}
`;
    const { content: metaJson } = await callOpenAI(metaPrompt, { temperature: 0.6, max_tokens: 2200 });
    const meta = safeParse(metaJson, "short-meta") ?? { logline: "", synopsis: "", themes: [], shortScript: [] };

    // B) write screenplay as plain text (Fountain)
    const writePrompt = `
Write a screenplay in Fountain format of ~${targetPages} pages (1 page ≈ 220 words).
Start with FADE IN: and include the opening scene heading.
Use this idea/genre and remain consistent with the meta below.
Output screenplay text ONLY. No JSON. No commentary.

=== META ===
${JSON.stringify({ idea, genre, logline: meta.logline, synopsis: meta.synopsis, themes: meta.themes }, null, 2)}
`;
    const { content: scriptText } = await callOpenAIText(writePrompt, { temperature: 0.8, max_tokens: 3800 });

    return {
      logline: meta.logline,
      synopsis: meta.synopsis,
      scriptText: scriptText.trim(),
      shortScript: meta.shortScript || [],
      themes: meta.themes || [],
    };
  }

  // ---------- Medium/Long scripts: outline as JSON, writing as text chunks ----------
  // Step 1: Robust Outline (with retries & fallbacks)
  const outlineParsed = await getRobustOutline({
    idea,
    genre,
    targetPages,
    approxScenes,
    synopsisLength,
  });
  const shortScript: ShortScriptItem[] = outlineParsed.shortScript || [];

  // Step 2: Chunk writing loop (plain text Fountain)
  const wordsPerPage = 220;

  // ✅ Bigger chunks for features => fewer calls => less “stops early”
  const pagesPerChunk =
    duration >= 90 ? 10 :
    duration >= 60 ? 8 :
    duration >= 30 ? 6 : 5;

  // ✅ Give features more completion budget
  const chunkMaxTokens =
    duration >= 90 ? 6500 :
    duration >= 60 ? 6000 :
    duration >= 30 ? 4500 : 3500;

  const numChunks = Math.ceil(targetPages / pagesPerChunk);

  let scriptFountain = "";
  let pageEstimate = 0;
  let chunkIndex = 0;
  let previousChunkTail = "";

  while (pageEstimate < targetPages - 2 && chunkIndex < numChunks + 8) {
    const startScene = Math.floor(chunkIndex * (approxScenes / numChunks)) + 1;
    const endScene = Math.min(Math.floor((chunkIndex + 1) * (approxScenes / numChunks)), approxScenes);
    const chunkScenes = shortScript.slice(startScene - 1, endScene);

    const guidance = `
=== OUTLINE GUIDANCE (for guidance only) ===
${JSON.stringify(
  { logline: outlineParsed.logline, synopsis: outlineParsed.synopsis, themes: outlineParsed.themes, scenes: chunkScenes },
  null,
  2
)}
`;

    const isStart = !previousChunkTail;

    const continuationPrompt = `
Write approximately ${pagesPerChunk} pages of screenplay in **Fountain format**.
1 page ≈ ${wordsPerPage} words. Output screenplay text ONLY.

${isStart ? `Start from scratch. Include "FADE IN:" and the first scene heading.` : `Continue seamlessly from the prior text.`}

Start at scene ${startScene} and continue through scene ${endScene}, but if those conclude early, continue into the next logical scenes to keep flow natural.

Maintain continuity with character names, timeline, and events. Avoid repeating lines.

RECENT CONTEXT (last lines of the script, if any):
${previousChunkTail || "(Script start)"}

${guidance}
`;

    // First attempt for this chunk
    let { content: chunkText } = await callOpenAIText(continuationPrompt, {
      temperature: 0.8,
      max_tokens: chunkMaxTokens,
    });

    // If we clearly under-shot, iterate to top it up
    let localEstimate = estimatePagesFromText(chunkText, wordsPerPage);
    let topUpAttempts = 0;
    const minChunkPages = Math.max(3, Math.round(pagesPerChunk * 0.8));

    while (localEstimate < minChunkPages && topUpAttempts < 3) {
      const topupPrompt = `
Continue the screenplay immediately from this exact text (do not repeat lines):
---
${tail(chunkText, 3500)}
---

Write more until this chunk reaches roughly ${pagesPerChunk} pages.
Fountain format only. No summaries. No commentary.
`;
      const top = await callOpenAIText(topupPrompt, { temperature: 0.8, max_tokens: chunkMaxTokens });
      chunkText += "\n\n" + top.content;
      localEstimate = estimatePagesFromText(chunkText, wordsPerPage);
      topUpAttempts++;
    }

    // Append to full script
    scriptFountain += (scriptFountain ? "\n\n" : "") + chunkText.trim();
    pageEstimate = estimatePagesFromText(scriptFountain, wordsPerPage);
    previousChunkTail = tail(scriptFountain, 4000);
    chunkIndex++;

    // Safety: stop if overshoot a lot
    if (pageEstimate > targetPages + 12) break;
  }

  // ✅ Expansion passes if still short (model compression is common on features)
  let expandGuard = 0;
  while (pageEstimate < targetPages - 2 && expandGuard < 4) {
    const neededPages = Math.max(3, targetPages - pageEstimate);
    const addPages = Math.min(12, neededPages);

    const expansionPrompt = `
Expand the existing screenplay by adding:
- connective scenes that logically bridge beats,
- richer dialogue beats with subtext,
- character moments that deepen arcs,
- small B-plot texture that supports the theme,

WITHOUT contradicting existing events.
Write ~${addPages} more pages in Fountain format.
Do not restart. Do not summarize. Output screenplay ONLY.

RECENT CONTEXT:
${previousChunkTail}
`;
    const expansion = await callOpenAIText(expansionPrompt, { temperature: 0.82, max_tokens: chunkMaxTokens });
    const addText = (expansion.content || "").trim();
    if (!addText) break;

    scriptFountain += "\n\n" + addText;
    pageEstimate = estimatePagesFromText(scriptFountain, wordsPerPage);
    previousChunkTail = tail(scriptFountain, 4000);
    expandGuard++;
  }

  return {
    logline: outlineParsed.logline,
    synopsis: outlineParsed.synopsis,
    scriptText: scriptFountain.trim(),
    shortScript: shortScript,
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
  let characters: any[] = [];
  const parsed = safeParse<{ characters: any[] }>(content, "characters");
  if (parsed?.characters) {
    characters = parsed.characters;
  } else {
    console.error("Failed to parse characters JSON:", content?.slice(0, 400));
  }

  return { characters };
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
  let storyboard: StoryboardFrame[] = [];
  if (parsed?.storyboard) storyboard = parsed.storyboard;
  else console.error("Failed to parse storyboard JSON:", content?.slice(0, 400));

  return storyboard;
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
  // NOTE: This was previously guessing duration from script digits. Keeping behavior unchanged for now
  // since you asked to focus on script generator quality first.
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
    const [mins, secs] = (asset.duration || "00:10").split(":").map((n: string) => parseInt(n, 10) || 0);
    const totalSecs = (mins || 0) * 60 + (secs || 0);
    const adjustedDuration = totalSecs >= 10 ? asset.duration : minDuration;
    return { ...asset, duration: adjustedDuration, audioUrl: "" };
  });

  return { soundAssets };
};
