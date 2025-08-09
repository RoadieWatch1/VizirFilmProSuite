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

// ---------- Utility for page estimation ----------

function estimatePagesFromText(text: string, wordsPerPage = 220) {
  // Simple, robust page estimate
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerPage));
}

function tail(text: string, maxChars = 4000) {
  if (!text) return "";
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

// ---------- GENERATORS ----------

export const generateScript = async (
  idea: string,
  genre: string,
  length: string
) => {
  const duration = parseInt(length.replace(/\D/g, ""), 10) || 5; // minutes
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
    structureGuide = "A feature-length script with 40-60 scenes, detailed three-act structure, multiple storylines, deep character development, and thematic complexity.";
    numActs = 3;
    numCharacters = 5;
    synopsisLength = "400 words";
  } else {
    structureGuide = "A full feature film with 80-120 scenes, extended three-act structure, complex subplots, ensemble cast, and thematic depth.";
    numActs = 3;
    numCharacters = 7;
    synopsisLength = "500 words";
  }

  // ---------- Short scripts: single call (JSON) ----------
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

  if (duration <= 15) {
    const prompt = `${basePrompt}
Output JSON with:
- logline: 1-sentence summary
- synopsis: ${synopsisLength} synopsis
- scriptText: Full screenplay text (aim for ${targetPages} pages)
- shortScript: Array of objects with {scene: heading, description: action summary, dialogue: key lines}
- themes: Array of 3-5 themes
`;
    const { content } = await callOpenAI(prompt, { temperature: 0.7, max_tokens: 4096 });
    const parsed = JSON.parse(content);
    return {
      logline: parsed.logline,
      synopsis: parsed.synopsis,
      scriptText: parsed.scriptText,
      shortScript: parsed.shortScript,
      themes: parsed.themes,
    };
  }

  // ---------- Medium/Long scripts: outline as JSON, writing as text chunks ----------
  // Step 1: Outline
  const outlinePrompt = `${basePrompt}
First, create a detailed outline.
Output JSON with:
- logline: 1-sentence summary
- synopsis: ${synopsisLength} synopsis
- shortScript: Array of detailed scene objects (exactly ${approxScenes} scenes) with {act: number, sceneNumber: number, heading: "INT/EXT. LOCATION - TIME", summary: 100-200 word action/dialogue summary}
- themes: Array of 3-5 themes
`;
  const { content: outlineContent } = await callOpenAI(outlinePrompt, { temperature: 0.6, max_tokens: 4096 });
  const outlineParsed = JSON.parse(outlineContent);
  const shortScript: ShortScriptItem[] = outlineParsed.shortScript;

  // Step 2: Chunk writing loop (plain text Fountain)
  const wordsPerPage = 220;
  const pagesPerChunk = duration >= 90 ? 7 : 6; // slightly larger chunks for features
  const numChunks = Math.ceil(targetPages / pagesPerChunk);

  let scriptFountain = "";
  let pageEstimate = 0;
  let chunkIndex = 0;
  let previousChunkTail = "";

  while (pageEstimate < targetPages - 3 && chunkIndex < numChunks + 5) {
    const startScene = Math.floor((chunkIndex) * (approxScenes / numChunks)) + 1;
    const endScene = Math.min(
      Math.floor((chunkIndex + 1) * (approxScenes / numChunks)),
      approxScenes
    );
    const chunkScenes = shortScript.slice(startScene - 1, endScene);

    const guidance = `
=== GLOBAL OUTLINE (for guidance only) ===
${JSON.stringify(
  {
    logline: outlineParsed.logline,
    synopsis: outlineParsed.synopsis,
    themes: outlineParsed.themes,
    scenes: chunkScenes,
  },
  null,
  2
)}
`;

    const continuationPrompt = `
Write approximately ${pagesPerChunk} pages of screenplay in **Fountain format**, continuing the film.
1 page ≈ ${wordsPerPage} words. Do NOT summarize. Do NOT output JSON. Output screenplay text ONLY.

Start at scene ${startScene} and continue through scene ${endScene}, but if those conclude early, continue into the next logical scenes to keep the flow natural.

Maintain consistency with character names and events.

RECENT CONTEXT (last lines of the script, if any):
${previousChunkTail || "(Script start)"}

${guidance}
`;

    // First attempt for this chunk
    let { content: chunkText, finish_reason } = await callOpenAIText(continuationPrompt, {
      temperature: 0.8,
      max_tokens: 3500,
    });

    // If we clearly under-shot, iterate a couple of times to top it up
    let localEstimate = estimatePagesFromText(chunkText, wordsPerPage);
    let topUpAttempts = 0;
    while (localEstimate < Math.max(3, Math.round(pagesPerChunk * 0.8)) && topUpAttempts < 3) {
      const topupPrompt = `
Continue the screenplay immediately from this exact text (do not repeat lines):
---
${tail(chunkText, 3500)}
---

Write more until this chunk reaches roughly ${pagesPerChunk} pages. No summaries. Fountain format only.
`;
      const top = await callOpenAIText(topupPrompt, { temperature: 0.8, max_tokens: 3500 });
      chunkText += "\n\n" + top.content;
      localEstimate = estimatePagesFromText(chunkText, wordsPerPage);
      topUpAttempts++;
    }

    // Append to full script
    scriptFountain += (scriptFountain ? "\n\n" : "") + chunkText.trim();
    pageEstimate = estimatePagesFromText(scriptFountain, wordsPerPage);
    previousChunkTail = tail(scriptFountain, 4000);
    chunkIndex++;

    // Safety: stop if we really overshoot by a lot
    if (pageEstimate > targetPages + 10) break;
  }

  // Optional expansion pass if we're still short by >5 pages
  if (pageEstimate < targetPages - 5) {
    const neededPages = targetPages - pageEstimate;
    const expansionPrompt = `
Expand the existing screenplay by weaving B-plots, connective tissue between scenes, and richer dialogue beats—without contradicting existing events.
Write ~${Math.min(10, neededPages)} more pages in Fountain format. No summaries, screenplay text ONLY.

RECENT CONTEXT:
${previousChunkTail}
`;
    const expansion = await callOpenAIText(expansionPrompt, { temperature: 0.85, max_tokens: 3500 });
    scriptFountain += "\n\n" + expansion.content.trim();
    pageEstimate = estimatePagesFromText(scriptFountain, wordsPerPage);
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
  try {
    const parsed = JSON.parse(content);
    characters = parsed.characters || [];
  } catch (e) {
    console.error("Failed to parse characters JSON:", e, content);
    characters = [];
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
  const duration = parseInt(scriptLength.replace(/\D/g, ""), 10) || 5;
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
  let storyboard: StoryboardFrame[] = [];
  try {
    const parsed = JSON.parse(content);
    storyboard = parsed.storyboard || [];
  } catch (e) {
    console.error("Failed to parse storyboard JSON:", e, content);
    storyboard = [];
  }

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
  let concept = {};
  let visualReferences: any[] = [];
  try {
    const parsed = JSON.parse(content);
    concept = parsed.concept || {};
    visualReferences = parsed.visualReferences || [];
  } catch (e) {
    console.error("Failed to parse concept JSON:", e, content);
  }

  return { concept, visualReferences };
};

// ---------- Budget ----------

export const generateBudget = async (genre: string, length: string) => {
  const duration = parseInt(length.replace(/\D/g, ""), 10) || 5;
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
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse budget JSON:", e, content);
    parsed = { categories: [] };
  }
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
  let schedule: any[] = [];
  try {
    const parsed = JSON.parse(content);
    schedule = parsed.schedule || [];
  } catch (e) {
    console.error("Failed to parse schedule JSON:", e, content);
    schedule = [];
  }
  return { schedule };
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
  let locations: any[] = [];
  try {
    const parsed = JSON.parse(content);
    locations = parsed.locations || [];
  } catch (e) {
    console.error("Failed to parse locations JSON:", e, content);
    locations = [];
  }
  return { locations };
};

// ---------- Sound Assets ----------

export const generateSoundAssets = async (script: string, genre: string) => {
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
  let soundAssets: any[] = [];
  try {
    const parsed = JSON.parse(content);
    soundAssets = parsed.soundAssets || [];
    const minDuration = duration >= 60 ? "00:30" : "00:10";
    soundAssets = soundAssets.map((asset) => {
      const [mins, secs] = (asset.duration || "00:10").split(":").map(Number);
      const totalSecs = (mins || 0) * 60 + (secs || 0);
      const adjustedDuration = totalSecs >= 10 ? asset.duration : minDuration;
      return { ...asset, duration: adjustedDuration, audioUrl: "" };
    });
  } catch (e) {
    console.error("Failed to parse sound assets JSON:", e, content);
    soundAssets = [];
  }

  return { soundAssets };
};
