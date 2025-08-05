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

Always produce valid JSON without any extra commentary or markdown (e.g., no \`\`\`json).
`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
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

  let structureGuide = "";
  let numActs = 1;
  let approxScenes = Math.round(duration / 2); // Assuming average scene length of 2 minutes/pages

  if (duration <= 5) {
    // Very short: simple structure
    structureGuide = "A very concise script with 1-2 scenes, minimal dialogue, focus on visual storytelling.";
    approxScenes = 1 + Math.floor(duration / 2);
  } else if (duration <= 15) {
    // Short film: basic setup and resolution
    numActs = 2;
    structureGuide = "Structure as a short film with setup and resolution. Include detailed scene descriptions and dialogue.";
    approxScenes = Math.round(duration / 1.5);
  } else if (duration <= 30) {
    // Mid-length: introduce some complexity
    numActs = 3;
    structureGuide = "Structure in 3 acts: beginning, middle, end. Build tension with multiple scenes.";
    approxScenes = Math.round(duration / 1.5);
  } else {
    // Feature length: full 3-act structure
    numActs = 3;
    structureGuide = `Full feature script in 3 acts with approximately ${approxScenes} scenes total. 
Act 1: Setup (about 25% of script), Act 2: Confrontation (about 50%), Act 3: Resolution (about 25%).
Include subplots, character development, detailed dialogues, and action descriptions to fill the length.`;
    approxScenes = Math.round(duration / 1.2); // Slightly more scenes for longer films
  }

  const prompt = `
Generate a film project based on the following idea: ${idea}

Genre: ${genre}

- Logline (1-2 sentences, concise and compelling)
- Synopsis (summarizing the story, appropriate length: up to 200 words for short films, up to 500 words for features)
- A professional film script of approximately ${approxPages} pages in proper screenplay format. 
${structureGuide}
Include:
  • Scene headings (e.g., INT. FOREST - DAY)
  • Action lines in present tense
  • Character names uppercase and centered
  • Dialogue indented under character names
  • No camera directions or lens specifications
Use standard screenplay format:
- Scene headings: INT./EXT. LOCATION - TIME
- Action lines: Describe visuals, characters, actions in present tense.
- Character names: Uppercase for dialogue.
- Dialogue: Under character name.
- Transitions: Only if necessary (e.g., CUT TO:).
Aim for an average scene length of 1-3 pages, totaling around ${approxScenes} scenes.
Make descriptions vivid and detailed, dialogues natural and revealing, to ensure the script reaches the appropriate length.
- A JSON array named "shortScript" for storyboarding, with approximately ${approxScenes * 2} items, each containing:
  • scene (short title)
  • shotNumber (e.g., "1A")
  • description (2-3 sentences)
  • cameraAngle (e.g., "Close-Up")
  • cameraMovement (e.g., "Static")
  • lens (e.g., "35mm")
  • lighting (e.g., "Soft natural light")
  • duration (e.g., "5 seconds")
  • dialogue (spoken lines, if any)
  • soundEffects (e.g., "Birds chirping")
  • notes (directorial notes)
  • imagePrompt (1-sentence visual description for DALL-E)
  • imageUrl (empty string)
  • coverageShots (array of same fields, 4 per scene)

Return a JSON object with keys:
- logline
- synopsis
- scriptText
- shortScript
`;

  const maxTokens = Math.min(16384, approxPages * 200 + 1000); // Adjust max_tokens based on length; assume ~200 tokens per page + extra for other parts
  const result = await callOpenAI(prompt, { max_tokens: maxTokens });

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

  console.log("Generated script:", data.scriptText);

  return {
    logline: data.logline || "",
    synopsis: data.synopsis || "",
    script: data.scriptText || "",
    scriptText: data.scriptText || "",
    shortScript: data.shortScript || [],
    themes: ["Determination", "Growth", "Conflict Resolution", "Human Nature"],
  };
};

export const generateCharacters = async (script: string, genre: string) => {
  const prompt = `
Given the following film script or story content:
${script}

Generate a list of 3-5 main characters, each with:
- name (string)
- role (Protagonist, Antagonist, Supporting, etc.)
- description (1-sentence description)
- traits (array of 3-5 strings)
- skinColor (hex code, e.g., "#8C5D3C")
- hairColor (hex code, e.g., "#1C1C1C")
- clothingColor (hex code, e.g., "#A33C2F")
- mood (string, e.g., "serious" or "playful")

Return a JSON object with key "characters" containing the array of character objects.
`;

  const result = await callOpenAI(prompt);

  let characters: Character[] = [];
  try {
    const parsed = JSON.parse(result);
    if (Array.isArray(parsed.characters)) {
      characters = parsed.characters
        .filter(
          (char: any) =>
            typeof char?.name === "string" &&
            typeof char?.description === "string" &&
            typeof char?.role === "string" &&
            Array.isArray(char?.traits) &&
            typeof char?.skinColor === "string" &&
            typeof char?.hairColor === "string" &&
            typeof char?.clothingColor === "string" &&
            typeof char?.mood === "string"
        )
        .map((char: any) => ({
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

  // Generate images for each character
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const visualDescription = [
      `Character name: ${char.name}`,
      `Description: ${char.description}`,
      char.role ? `Role: ${char.role}` : "",
      char.mood ? `Mood: ${char.mood}` : "",
      char.skinColor ? `Skin color: ${char.skinColor}` : "",
      char.hairColor ? `Hair color: ${char.hairColor}` : "",
      char.clothingColor ? `Clothing color: ${char.clothingColor}` : "",
    ]
      .filter(Boolean)
      .join(". ");
    const imagePrompt = `Photorealistic full-body portrait of a real person portraying the character. ${visualDescription}. Cinematic style, high detail, natural colors, realistic textures and lighting. Ensure full head and body are in frame, no cropping. The image should look like a professional actor in costume, ready for film production.`;

    try {
      const dalleImage = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1792",
      });

      characters[i].imageUrl = dalleImage.data?.[0]?.url || "";
      characters[i].visualDescription = visualDescription;
      console.log(`Generated image for ${char.name}:`, characters[i].imageUrl);
    } catch (err) {
      console.error("Failed to generate image for character:", char.name, err);
      characters[i].imageUrl = "";
      characters[i].visualDescription = visualDescription;
    }
  }

  console.log("Generated characters:", characters);

  return { characters };
};

export const generateConcept = async (script: string, genre: string) => {
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

Return a JSON object with keys: concept, visualReferences.
`;

  const result = await callOpenAI(prompt);

  let jsonData: any = {};
  try {
    jsonData = JSON.parse(result);
  } catch (e) {
    console.error("Failed to parse concept JSON:", e, result);
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

Characters for visual consistency:
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

Return a JSON object with key "storyboard" containing the array.
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

Return JSON with key "categories" containing an array of category objects, each with:
- name
- amount (in USD)
- percentage (total ~100%)
- items (array of strings)
- tips (array of strings)
- alternatives (array of strings)

Include categories:
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

${lowBudgetMode ?
`For lowBudgetMode:
- Reduce amounts by ~50%.
- Provide cost-saving tips and low-cost alternatives for each category.` :
`For standard budget:
- Use industry-standard costs.
- Tips and alternatives can be empty if not applicable.`}
`;

  const result = await callOpenAI(prompt);

  let parsed;
  try {
    parsed = JSON.parse(result);
  } catch (e) {
    console.error("Failed to parse budget JSON:", e, result);
    parsed = { categories: [] };
  }

  if (lowBudgetMode && parsed.categories) {
    parsed.categories = parsed.categories.map((cat: any) => ({
      ...cat,
      amount: Math.round(cat.amount * 0.5),
    }));
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

  const result = await callOpenAI(prompt);

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

  const result = await callOpenAI(prompt);

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
  const prompt = `
Given this film script:
${script}

Generate 3-5 sound assets for a ${genre} film, each with:
- name (unique and descriptive, reflecting the asset's purpose)
- type (music, sfx, dialogue, ambient)
- duration (minimum 10 seconds, formatted as "MM:SS", e.g., "00:10")
- description (highly detailed, vivid description for AI audio generation, including specific elements, tones, intensities, and how it enhances the scene's mood or action; at least 50 words)
- scenes (array of scene names or descriptions where the asset appears)
- audioUrl (empty string)

Return a JSON object with key "soundAssets" containing the array of sound asset objects.
`;

  const result = await callOpenAI(prompt);

  let soundAssets: any[] = [];
  try {
    const parsed = JSON.parse(result);
    soundAssets = parsed.soundAssets || [];
    // Ensure minimum duration of 10 seconds
    soundAssets = soundAssets.map((asset) => ({
      ...asset,
      duration: asset.duration && parseInt(asset.duration.split(":")[1]) >= 10 ? asset.duration : "00:10",
      audioUrl: "", // Ensure audioUrl is empty
    }));
  } catch (e) {
    console.error("Failed to parse sound assets JSON:", e, result);
    soundAssets = [];
  }

  console.log("Generated sound assets:", soundAssets);

  return { soundAssets };
};