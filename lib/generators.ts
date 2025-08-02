// C:\Users\vizir\VizirPro\lib\generators.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Helper for chat calls ----------

async function callOpenAI(prompt: string): Promise<string> {
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
[
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
[
  {
    "name": "...",
    "role": "...",
    "description": "...",
    "traits": ["...", "..."]
  }
]

**When generating locations**, produce:
[
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

Always produce valid JSON without any extra commentary.
      `,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
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
- Name
- Role (Protagonist, Antagonist, Supporting, etc.)
- 1-sentence description
- Key traits (3-5 words)

Format as JSON array.
`;

  const result = await callOpenAI(prompt);

  let characters: Character[] = [];
  try {
    const parsed = JSON.parse(result);

    if (Array.isArray(parsed)) {
      characters = parsed
        .filter(
          (char) =>
            typeof char?.name === "string" &&
            typeof char?.description === "string" &&
            typeof char?.role === "string"
        )
        .map((char) => ({
          name: char.name,
          role: char.role,
          description: char.description,
          traits: Array.isArray(char.traits) ? char.traits : [],
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
        }.`
    )
    .join("\n");

  const prompt = `
You are a professional storyboard artist.

Film Idea: ${movieIdea}
Genre: ${movieGenre}
Script:
${script}

Characters for visual consistency:
${characterBlock}

Generate exactly ${numImages} storyboard frames in JSON array format.

For each frame, generate ALL of these fields:
- scene (short title)
- shotNumber (e.g. "23A")
- description (2-3 sentences describing the visual and dramatic content)
- cameraAngle (e.g. "Close-Up," "Wide Shot")
- cameraMovement (describe camera movement, if any)
- lens (optional, e.g. "35mm lens")
- lighting (mood, color, intensity)
- duration (e.g. "4 seconds")
- dialogue (spoken lines in the shot, if any)
- soundEffects (notable sounds in this shot)
- notes (technical or creative notes)
- imagePrompt (one-sentence visual description suitable for DALL-E)
- imageUrl (leave empty)

IMPORTANT: For each frame, also generate exactly 6 coverageShots.

For coverageShots:
- coverageShots must be an array of 6 objects.
- Each coverageShot must include ALL the same fields listed above for a frame.
- Do not skip coverageShots.
- Never return empty arrays for coverageShots.

Images should be black-and-white pencil sketches in a comic-book storyboard style.

Return a valid JSON array.
`;

  const result = await callOpenAI(prompt);

  let frames: StoryboardFrame[] = [];
  try {
    frames = JSON.parse(result);
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
          prompt: `${frame.imagePrompt}. Comic-book style black-and-white pencil sketch.`,
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
              prompt: `${shot.imagePrompt}. Comic-book style black-and-white pencil sketch.`,
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
  if (isNaN(mins)) return 4;

  if (mins <= 1) return 2;
  if (mins <= 5) return 4;
  if (mins <= 10) return 6;
  if (mins <= 15) return 8;
  if (mins <= 30) return 12;
  if (mins <= 60) return 20;
  if (mins <= 120) return 35;
  return 4;
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

  const result = await callOpenAI(prompt);

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
Return ONLY the following between tags:

<<LOCATIONS>>
[
  {
    "name": "EXT. PARK ENTRANCE - LATER",
    "type": "Exterior",
    "description": "A sunny public park with colorful signage and shaded walkways.",
    "mood": "Joyful, playful",
    "colorPalette": "Green, yellow, sky blue",
    "propsOrFeatures": ["Park bench", "Rabbit hat", "Children's laughter"],
    "scenes": ["Bobo performs a magic trick for the kids"],
    "rating": 4.5,
    "lowBudgetTips": "Film in a free public park with minimal crew.",
    "highBudgetOpportunities": "Add extras, elaborate costumes, and cranes for wide shots."
  }
]
<</LOCATIONS>>
`;

  const result = await callOpenAI(prompt);

  console.log("🟠 RAW GPT result for locations:", result);

  let locations: any[] = [];

  try {
    const jsonMatch = result.match(/<<LOCATIONS>>\s*(\[\s*{[\s\S]*?}\s*\])\s*<<\/LOCATIONS>>/);
    if (jsonMatch && jsonMatch[1]) {
      locations = JSON.parse(jsonMatch[1]);
    } else {
      console.error("⚠️ Could not extract location JSON from GPT result.");
      locations = [];
    }
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

Format as JSON array.
`;

  const result = await callOpenAI(prompt);

  let soundAssets = [];
  try {
    soundAssets = JSON.parse(result);
  } catch (e) {
    console.error("Failed to parse sound assets JSON:", e, result);
    soundAssets = [];
  }

  return { soundAssets };
};