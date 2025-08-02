// C:\Users\vizir\VizirPro\lib\generators.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Helper for chat calls ----------

async function callOpenAI(prompt: string, isJsonObject: boolean = true): Promise<string> {
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

- scriptText should be a professional screenplay in correct screenplay formatting:
  • SCENE HEADINGS (e.g. INT. FOREST - DAY)
  • Action lines in present tense
  • Character names uppercase and centered
  • Dialogue indented under character names
  • No camera directions or lenses in the first draft script

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

Always fill imagePrompt with a short visual description. Leave imageUrl empty—it will be filled separately via DALL-E.

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
      "traits": ["...", "..."]
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
      "scenes": ["...", "..."]
    }
  ]
}

Always produce valid JSON without any extra commentary.
      `,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: isJsonObject ? { type: "json_object" } : undefined,
  });

  return completion.choices[0].message.content ?? "";
}

// ---------- GENERATORS ----------

export const generateScript = async (
  idea: string,
  genre: string,
  length: string
) => {
  const prompt = `
Generate the following for a film project:

- Logline (1-2 sentences)
- Synopsis (max 150 words)
- A professional film script of about ${length} in proper screenplay format (2-5 pages). Include:
    • Scene headings (sluglines)
    • Action lines in present tense
    • Character names uppercase and centered
    • Dialogue indented under character names
    • No camera directions or lens specifications in this version

THEN also generate a JSON array named "shortScript" suitable for storyboarding. Each item should contain:
- scene
- shotNumber
- description
- cameraAngle
- cameraMovement
- lens
- lighting
- duration
- dialogue
- soundEffects
- notes
- imagePrompt
- imageUrl (leave empty)
- coverageShots (array of same fields)

Return the entire result as a single JSON object with keys:
- logline
- synopsis
- scriptText
- shortScript

Idea: ${idea}
Genre: ${genre}
`;

  const result = await callOpenAI(prompt);

  let data;
  try {
    data = JSON.parse(result);
  } catch (e) {
    console.error("Failed to parse script JSON:", e, result);
    data = {
      logline: "",
      synopsis: "",
      scriptText: "",
      shortScript: [],
    };
  }

  return {
    logline: data.logline,
    synopsis: data.synopsis,
    script: data.scriptText,
    scriptText: data.scriptText,
    shortScript: data.shortScript,
    themes: ["Determination", "Growth", "Conflict Resolution", "Human Nature"],
  };
};

export const generateCharacters = async (
  script: string,
  genre: string
) => {
  const prompt = `
Given the following film script or story content:
${script}

Generate a list of 3-5 main characters.
For each character, provide:
- name (string)
- role (Protagonist, Antagonist, Supporting, etc.)
- description (1-sentence description)
- traits (array of 3-5 strings)
- skinColor (hex code, e.g. "#8C5D3C")
- hairColor (hex code, e.g. "#1C1C1C")
- clothingColor (hex code, e.g. "#A33C2F")
- mood (string, e.g. "serious" or "playful")

Output valid JSON as an object with key "characters" containing the array of objects. No extra text or commentary.
`;

  const result = await callOpenAI(prompt);

  let characters: Character[] = [];
  try {
    const parsed = JSON.parse(result);

    const charArray = parsed.characters || parsed;

    if (Array.isArray(charArray)) {
      characters = charArray
        .filter(
          (char) =>
            typeof char?.name === "string" &&
            typeof char?.description === "string" &&
            typeof char?.role === "string" &&
            Array.isArray(char?.traits) &&
            typeof char?.skinColor === "string" &&
            typeof char?.hairColor === "string" &&
            typeof char?.clothingColor === "string" &&
            typeof char?.mood === "string"
        )
        .map((char) => ({
          name: char.name,
          role: char.role,
          description: char.description,
          traits: char.traits,
          skinColor: char.skinColor,
          hairColor: char.hairColor,
          clothingColor: char.clothingColor,
          mood: char.mood,
        }));
    }
  } catch (e) {
    console.error("Failed to parse character JSON:", e, result);
    characters = [];
  }

  console.log("Generated characters:", characters);

  return { characters };
};

export const generateConcept = async (
  script: string,
  genre: string
) => {
  const prompt = `
Given the following film script or synopsis:

${script}

Generate a cinematic concept document for a ${genre} film including:
- Visual style and color palette
- Camera techniques
- Lighting approach
- Thematic symbolism
- Production values

Also generate 3-5 visual references. For each reference, include:
- short description (max 20 words)
- a realistic or placeholder image URL

Return JSON.
`;

  const raw = await callOpenAI(prompt);

  let jsonData: any = {};
  try {
    jsonData = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse concept JSON:", e, raw);
    jsonData = {
      concept: {},
      visualReferences: [],
    };
  }

  return {
    concept: {
      visualStyle: jsonData.concept?.visualStyle || "",
      colorPalette: jsonData.concept?.colorPalette || "",
      cameraTechniques: jsonData.concept?.cameraTechniques || "",
      lightingApproach: jsonData.concept?.lightingApproach || "",
      thematicSymbolism: jsonData.concept?.thematicSymbolism || "",
      productionValues: jsonData.concept?.productionValues || "",
    },
    visualReferences: jsonData.visualReferences || [],
  };
};

// ---------- Storyboard Types ----------

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

// ---------- Storyboard Generator ----------

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
  characters?: Character[];
}): Promise<StoryboardFrame[]> => {
  const numImages = determineNumberOfImages(scriptLength);

  const characterBlock = (characters || [])
    .map(
      (c) =>
        `Character: ${c.name}. Description: ${
          c.visualDescription || c.description || ""
        }. Skin: ${c.skinColor || "default"}. Hair: ${c.hairColor || "default"}. Clothing: ${c.clothingColor || "default"}. Mood: ${c.mood || "neutral"}.`
    )
    .join("\n");

  const prompt = `
You are a professional storyboard artist creating a high-quality film storyboard.

Film Idea: ${movieIdea}
Genre: ${movieGenre}
Script:
${script}

Characters for visual consistency (include their appearances in all relevant image prompts):
${characterBlock}

Break the script into exactly ${numImages} key scenes chronologically, covering the main plot beats from beginning to end. For each scene, generate a main storyboard frame using professional conventions: varied shot compositions, dynamic angles, and ties to narrative tension.

Generate a JSON object with key "storyboard" containing an array of exactly ${numImages} frame objects.

For each frame, include ALL these fields:
- scene (short professional title, e.g., "INT. WAREHOUSE CONFRONTATION - NIGHT")
- shotNumber (e.g., "1A", increment sequentially)
- description (2-3 detailed sentences on visuals, action, and dramatic intent)
- cameraAngle (e.g., "Low Angle Wide Shot" for power dynamics)
- cameraMovement (e.g., "Slow Dolly In" or "Static" if none)
- lens (e.g., "Wide 24mm" for establishing shots)
- lighting (e.g., "Harsh shadows from overhead fluorescents, cool blue tones for suspense")
- duration (e.g., "5 seconds")
- dialogue (key lines spoken, if any)
- soundEffects (notable audio cues, e.g., "Echoing footsteps")
- notes (directorial notes, e.g., "Build tension with close framing")
- imagePrompt (detailed 1-2 sentence visual description for DALL-E: include setting details, character appearances/actions/expressions, composition, mood, genre style—e.g., "A tense low-angle wide shot of [character description] confronting [another] in a dimly lit warehouse, harsh shadows on faces, industrial background with flickering lights, comic-book style black-and-white pencil sketch")
- imageUrl (leave empty)

For each frame, also generate exactly 4 coverageShots (alternative angles for editing coverage in the same scene). Coverage shots provide variety: e.g., 1. Extreme close-up on face/emotion, 2. Over-the-shoulder for dialogue, 3. Medium reaction shot, 4. Dutch angle or special effect for tension (adapt to scene).

coverageShots is an array of 4 objects, each with ALL the same fields as a main frame (including unique imagePrompt tailored to the angle). Do not skip or leave empty.

All images are black-and-white pencil sketches in a professional comic-book storyboard style.

Return ONLY the valid JSON object like { "storyboard": [ ... ] }, no other text.
`;

  const result = await callOpenAI(prompt);

  let frames: StoryboardFrame[] = [];
  try {
    const parsed = JSON.parse(result);
    frames = parsed.storyboard || [];
    if (!Array.isArray(frames) || frames.length !== numImages) {
      console.warn(`Storyboard generated ${frames.length} frames instead of ${numImages}.`);
    }
  } catch (e) {
    console.error("Failed to parse storyboard JSON:", e, result);
    frames = [];
  }

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    if (frame.imagePrompt) {
      try {
        const dalleImage = await openai.images.generate({
          model: "dall-e-3",
          prompt: `${frame.imagePrompt}. Professional comic-book style black-and-white pencil sketch.`,
          n: 1,
          size: "1024x1024",
        });

        if (dalleImage.data && dalleImage.data.length > 0) {
          frames[i].imageUrl = dalleImage.data[0].url;
        } else {
          frames[i].imageUrl = "";
        }
      } catch (err) {
        console.error("DALL·E error:", err);
        frames[i].imageUrl = "";
      }
    }

    if (frame.coverageShots && frame.coverageShots.length > 0) {
      for (let j = 0; j < frame.coverageShots.length; j++) {
        const shot = frame.coverageShots[j];
        if (shot.imagePrompt) {
          try {
            const dalleImage = await openai.images.generate({
              model: "dall-e-3",
              prompt: `${shot.imagePrompt}. Professional comic-book style black-and-white pencil sketch.`,
              n: 1,
              size: "512x512",
            });

            if (dalleImage.data && dalleImage.data.length > 0) {
              frame.coverageShots[j].imageUrl = dalleImage.data[0].url;
            } else {
              frame.coverageShots[j].imageUrl = "";
            }
          } catch (err) {
            console.error("DALL·E error (coverage shot):", err);
            frame.coverageShots[j].imageUrl = "";
          }
        }
      }
    }
  }

  return frames;
};

function determineNumberOfImages(scriptLength: string): number {
  const mins = parseInt(scriptLength.replace(/\D/g, ""), 10);
  if (isNaN(mins)) return 6;

  if (mins <= 1) return 3;
  if (mins <= 5) return 6;
  if (mins <= 10) return 8;
  if (mins <= 15) return 10;
  if (mins <= 30) return 15;
  if (mins <= 60) return 25;
  if (mins <= 120) return 40;
  return 6;
}

// ---------- Budget ----------

export const generateBudget = async (
  genre: string,
  length: string,
  lowBudgetMode: boolean = false
) => {
  const prompt = `
Generate a professional film budget breakdown for a ${length} ${genre} film.

Return JSON in this exact format:
{
  "categories": [
    {
      "name": "Category Name",
      "amount": number,
      "percentage": number,
      "items": ["item 1", "item 2"],
      "tips": ["tip 1", "tip 2"],
      "alternatives": ["alternative 1", "alternative 2"]
    },
    ...
  ]
}

Estimate realistic costs for:
- Pre-production
- Cast
- Crew
- Locations
- Equipment
- Art Department
- Post-Production
- Music & Sound
- Marketing
- Miscellaneous

Amounts should be in USD.
Percentages should total ~100%.
Keep it concise (max 10 categories).

${lowBudgetMode ? 
`If lowBudgetMode is true:
- Reduce all amounts by approximately 50%.
- Add cost-saving tips for each category.
- Suggest low-cost alternatives for each category.` 
: 
`If lowBudgetMode is false:
- Provide standard industry costs.
- Tips and alternatives can be empty arrays if not applicable.`}
`;

  const result = await callOpenAI(prompt);

  let parsed;

  try {
    parsed = JSON.parse(result || "{}");
  } catch (e) {
    console.error("Failed to parse budget JSON:", e, result);
    parsed = { categories: [] };
  }

  if (lowBudgetMode && parsed.categories) {
    // As a failsafe, reduce amounts even if the AI forgot to
    parsed.categories = parsed.categories.map((cat: any) => ({
      ...cat,
      amount: Math.round(cat.amount * 0.5),
    }));
  }

  return parsed;
};

// ---------- Schedule ----------

export const generateSchedule = async (
  script: string,
  length: string
) => {
  const prompt = `
Given this film script:
${script}

Generate a shooting schedule for a film of length ${length}.
For each day, list:
- day name
- activities (array of strings)
- duration
- optional location
- optional crew list

Format as JSON array.
`;

  const result = await callOpenAI(prompt, false); // Array, not object

  let schedule = [];
  try {
    schedule = JSON.parse(result);
  } catch (e) {
    console.error("Failed to parse schedule JSON:", e, result);
    schedule = [];
  }

  return { schedule };
};

// ---------- Locations ---------- 

export const generateLocations = async (
  script: string,
  genre: string
) => {
  const fallbackScript = `
A ${genre || "generic"} film featuring a protagonist navigating several dramatic locations:
- An abandoned warehouse full of shadows and secrets.
- Rainy neon-lit city streets at night.
- A dramatic rooftop showdown above a glowing skyline.
`;

  const usedScript = script && script.trim().length > 0 ? script : fallbackScript;

  const prompt = `
You are a professional film location scout.

Your task is to analyze the following film script and extract ALL distinct filming locations based on the scene headings and descriptions.

SCRIPT:

"""START_SCRIPT"""
${usedScript}
"""END_SCRIPT"""

RULES:
- Use only the actual locations from the script. Look for scene headings like "EXT. PARK ENTRANCE - LATER".
- Do NOT invent generic names like "Primary Location" or "Climax Location".
- NEVER leave any field blank or write "N/A".
- If script lacks details, create plausible cinematic descriptions — but still use the location names found in the script.
- Every location must include:
  - name (taken directly from scene heading)
  - type (Interior or Exterior)
  - description (visual and atmospheric details)
  - mood (emotional tone of the place)
  - colorPalette (key visual tones/colors)
  - propsOrFeatures (array of objects or environmental features)
  - scenes (short summary of what happens there)
  - rating (1–5 how visually powerful this location is)
  - lowBudgetTips (how to recreate affordably)
  - highBudgetOpportunities (how to elevate production design)

RESPONSE FORMAT:
Return ONLY a valid JSON object with key "locations" containing the array of location objects. No extra text or commentary.
`;

  const result = await callOpenAI(prompt);

  console.log("🟠 RAW GPT result for locations:", result);

  let locations: any[] = [];

  try {
    const parsed = JSON.parse(result);
    locations = parsed.locations || [];
  } catch (e) {
    console.error("❌ Failed to parse locations JSON:", e, result);
    locations = [];
  }

  return { locations };
};


// ---------- Sound Assets ----------

export const generateSoundAssets = async (
  script: string,
  genre: string
) => {
  const prompt = `
Given this film script:

${script}

Generate 3-5 sound assets for a ${genre} film.
For each asset, include:
- name
- type (music, sfx, dialogue, ambient)
- duration
- description (provide a highly detailed, vivid description of the sound to enable accurate AI audio generation, including specific elements, tones, intensities, and how it fits the scene)
- scenes where it appears

Format as JSON object with key "soundAssets" containing the array.
`;

  const result = await callOpenAI(prompt);

  let soundAssets = [];
  try {
    const parsed = JSON.parse(result);
    soundAssets = parsed.soundAssets || [];
  } catch (e) {
    console.error("Failed to parse sound assets JSON:", e, result);
    soundAssets = [];
  }

  return { soundAssets };
};