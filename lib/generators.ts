// C:\Users\vizir\VizirPro\lib\generators.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Helper for chat calls ----------

async function callOpenAI(
  prompt: string,
  options: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming> = {}
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
  "shortScript": [ ... ]
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
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: options.temperature || 0.7,
    response_format: { type: "json_object" },
    ...options,
  });

  let content = completion.choices[0].message.content ?? "";
  content = content.trim();
  if (content.startsWith("```json")) {
    content = content.slice(7);
  }
  if (content.endsWith("```")) {
    content = content.slice(0, -3);
  }
  content = content.trim();
  return content;
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

// ---------- GENERATORS ----------

export const generateScript = async (
  idea: string,
  genre: string,
  length: string
) => {
  const duration = parseInt(length.replace(/\D/g, ""), 10) || 5;
  const approxPages = duration;
  const approxScenes = Math.round(duration / 1.2);
  const minScenes = Math.max(3, Math.floor(approxScenes * 0.75));
  const maxScenes = Math.ceil(approxScenes * 1.25);

  let structureGuide = "";
  let numActs = 1;
  let numCharacters = 3;
  let synopsisLength = "150 words";

  // Adjust structure based on duration
  if (duration <= 1) {
    structureGuide = "A very concise script with 1-2 scenes, minimal dialogue, focus on visual storytelling.";
    numCharacters = 1;
    synopsisLength = "50 words";
  } else if (duration <= 5) {
    structureGuide = "A short script with 3-5 scenes, concise dialogue, and clear setup/resolution.";
    numCharacters = 2;
    synopsisLength = "100 words";
  } else if (duration <= 15) {
    structureGuide = "A structured short film with setup, confrontation, and resolution. Include rising action and a twist.";
    numActs = 3;
    numCharacters = 3;
    synopsisLength = "200 words";
  } else if (duration <= 30) {
    structureGuide = "A three-act structure with clear plot points, character arcs, and subplots.";
    numActs = 3;
    numCharacters = 4;
    synopsisLength = "300 words";
  } else if (duration <= 60) {
    structureGuide = "A feature-length script with detailed three-act structure, multiple subplots, and deep character development.";
    numActs = 3;
    numCharacters = 5;
    synopsisLength = "400 words";
  } else {
    structureGuide = "A full feature film with extended three-act structure, complex subplots, ensemble cast, and thematic depth.";
    numActs = 3;
    numCharacters = 7;
    synopsisLength = "500 words";
  }

  // Common prompt base
  const basePrompt = `
  Generate a professional screenplay for a ${genre} film based on this idea:
  ${idea}

  Specifications:
  - Title: Create a catchy title
  - Length: Aim for ${approxPages} pages total (1 page ≈ 1 minute)
  - Scenes: Between ${minScenes} and ${maxScenes} scenes
  - Characters: Up to ${numCharacters} main characters
  - Structure: ${structureGuide}
  - Acts: ${numActs} acts
  - Format: Standard screenplay format ONLY (no extra text)
  `;

  if (duration <= 15) {
    // Single call for short scripts
    const prompt = `${basePrompt}
    Output JSON with:
    - logline: 1-sentence summary
    - synopsis: ${synopsisLength} synopsis
    - scriptText: Full screenplay text
    - shortScript: Array of objects with {scene: heading, description: action summary, dialogue: key lines}
    `;
    const result = await callOpenAI(prompt);
    const parsed = JSON.parse(result);
    return {
      logline: parsed.logline,
      synopsis: parsed.synopsis,
      scriptText: parsed.scriptText,
      shortScript: parsed.shortScript,
    };
  } else {
    // Multi-part for long scripts
    // Step 1: Generate outline (logline, synopsis, detailed shortScript)
    const outlinePrompt = `${basePrompt}
    First, create a detailed outline.
    Output JSON with:
    - logline: 1-sentence summary
    - synopsis: ${synopsisLength} synopsis
    - shortScript: Array of detailed scene objects (exactly ${approxScenes} scenes) with {act: number, sceneNumber: number, heading: "INT/EXT. LOCATION - TIME", summary: 100-200 word action/dialogue summary}
    `;
    const outlineResult = await callOpenAI(outlinePrompt);
    const outlineParsed = JSON.parse(outlineResult);
    const shortScript = outlineParsed.shortScript;

    // Calculate chunks: Aim for ~10 pages per chunk to fit token limits
    const pagesPerChunk = 10;
    const numChunks = Math.ceil(approxPages / pagesPerChunk);
    let fullScriptText = "";
    let previousChunk = "";

    for (let chunk = 1; chunk <= numChunks; chunk++) {
      const startScene = Math.floor((chunk - 1) * (approxScenes / numChunks)) + 1;
      const endScene = Math.min(startScene + Math.floor(approxScenes / numChunks) - 1, approxScenes);
      const chunkScenes = shortScript.slice(startScene - 1, endScene);

      const chunkPrompt = `${basePrompt}
      Using this outline:
      Logline: ${outlineParsed.logline}
      Synopsis: ${outlineParsed.synopsis}
      Full scene outline: ${JSON.stringify(shortScript)}

      Previous script chunk (continue seamlessly): ${previousChunk}

      Now generate the FULL screenplay text ONLY for scenes ${startScene} to ${endScene} (${pagesPerChunk} pages worth).
      Start directly with the scene heading for scene ${startScene}.
      Output JSON with:
      - chunkText: The screenplay text for this chunk
      `;
      const chunkResult = await callOpenAI(chunkPrompt, { temperature: 0.5 });
      const chunkParsed = JSON.parse(chunkResult);
      fullScriptText += chunkParsed.chunkText + "\n\n";
      previousChunk = chunkParsed.chunkText;
    }

    return {
      logline: outlineParsed.logline,
      synopsis: outlineParsed.synopsis,
      scriptText: fullScriptText.trim(),
      shortScript: shortScript,
    };
  }
};

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

  const result = await callOpenAI(prompt, { temperature: 0.5 });

  let characters: any[] = [];
  try {
    const parsed = JSON.parse(result);
    characters = parsed.characters || [];
  } catch (e) {
    console.error("Failed to parse characters JSON:", e, result);
    characters = [];
  }

  return { characters };
};

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
  const numFrames = duration <= 5 ? 8 : duration <= 15 ? 15 : duration <= 30 ? 25 : 40;
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

  const result = await callOpenAI(prompt, { temperature: 0.6 });

  let storyboard: StoryboardFrame[] = [];
  try {
    const parsed = JSON.parse(result);
    storyboard = parsed.storyboard || [];
  } catch (e) {
    console.error("Failed to parse storyboard JSON:", e, result);
    storyboard = [];
  }

  return storyboard;
};

export const generateConcept = async (script: string, genre: string) => {
  const prompt = `
Based on this ${genre} film script:
${script}

Generate a visual concept including:
- concept object with visualStyle, colorPalette, cameraTechniques, lightingApproach, thematicSymbolism, productionValues
- visualReferences: array of 3-5 objects with description and imageUrl (real URLs to reference images)

Return the JSON object directly.
`;

  const result = await callOpenAI(prompt, { temperature: 0.7 });

  let concept = {};
  let visualReferences = [];
  try {
    const parsed = JSON.parse(result);
    concept = parsed.concept || {};
    visualReferences = parsed.visualReferences || [];
  } catch (e) {
    console.error("Failed to parse concept JSON:", e, result);
  }

  return { concept, visualReferences };
};

export const generateBudget = async (genre: string, length: string) => {
  const duration = parseInt(length.replace(/\D/g, ""), 10) || 5;
  const baseBudget = duration <= 5 ? 5000 : duration <= 15 ? 15000 : duration <= 30 ? 50000 : duration <= 60 ? 100000 : 200000;
  const genreMultiplier = genre.toLowerCase().includes("sci-fi") || genre.toLowerCase().includes("action") ? 1.5 : 1;

  const prompt = `
Generate a detailed film budget breakdown for a ${genre} film of ${length} length.
Total estimated budget: $${baseBudget * genreMultiplier}

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

  const result = await callOpenAI(prompt, { temperature: 0.4 });

  let parsed;
  try {
    parsed = JSON.parse(result);
  } catch (e) {
    console.error("Failed to parse budget JSON:", e, result);
    parsed = { categories: [] };
  }

  // Adjust for low budget if needed
  // Assuming lowBudgetMode from store, but since it's not passed, skip or assume false
  // For example:
  // if (lowBudgetMode) {
  //   parsed.categories = parsed.categories.map((cat: any) => ({
  //     ...cat,
  //     amount: Math.round(cat.amount * 0.5),
  //   }));
  // }

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

  const result = await callOpenAI(prompt, { temperature: 0.5 });

  let schedule = [];
  try {
    const parsed = JSON.parse(result);
    schedule = parsed.schedule || [];
  } catch (e) {
    console.error("Failed to parse schedule JSON:", e, result);
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

  const result = await callOpenAI(prompt, { temperature: 0.5 });

  let locations: any[] = [];
  try {
    const parsed = JSON.parse(result);
    locations = parsed.locations || [];
  } catch (e) {
    console.error("Failed to parse locations JSON:", e, result);
    locations = [];
  }

  return { locations };
};

// ---------- Sound Assets ----------

export const generateSoundAssets = async (script: string, genre: string) => {
  const duration = parseInt(script.match(/\d+/)?.[0] || "5", 10);
  const numAssets = duration <= 15 ? 5 : 8;

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

  const result = await callOpenAI(prompt, { temperature: 0.5 });

  let soundAssets: any[] = [];
  try {
    const parsed = JSON.parse(result);
    soundAssets = parsed.soundAssets || [];
    const minDuration = duration >= 60 ? "00:30" : "00:10";
    soundAssets = soundAssets.map((asset) => {
      const [mins, secs] = asset.duration.split(":").map(Number);
      const totalSecs = mins * 60 + secs;
      const adjustedDuration = totalSecs >= 10 ? asset.duration : minDuration;
      return {
        ...asset,
        duration: adjustedDuration,
        audioUrl: "",
      };
    });
  } catch (e) {
    console.error("Failed to parse sound assets JSON:", e, result);
    soundAssets = [];
  }

  console.log("Generated sound assets:", soundAssets);

  return { soundAssets };
};