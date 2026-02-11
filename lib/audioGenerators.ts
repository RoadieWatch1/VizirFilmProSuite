// lib/audioGenerators.ts
import { uploadAudioFile } from "./storageUtils";
import { generateAudioWithReplicate } from "./replicate";
import { generateSoundAssets } from "./generators";

export type SoundAsset = {
  name: string;
  type: "music" | "ambient" | "sfx" | "dialogue";
  duration: string;
  description: string;
  scenes: string[];
  audioUrl: string;
};

const AUDIOGEN_VERSION = process.env.REPLICATE_AUDIOGEN_VERSION || "154b3e5141493cb1b8cec976d9aa90f2b691137e39ad906d2421b74c2a8c52b8";
const MUSICGEN_VERSION = process.env.REPLICATE_MUSICGEN_VERSION || "7a76a8258b23fae65c5a22debb8841d1d7e816b75c2f24218cd2bd8573787906";

// Max assets to generate in parallel within Vercel's 300s limit
const MAX_PARALLEL = 3;
// Cap total assets to avoid timeout (each takes ~30-60s with polling)
const MAX_ASSETS = 6;

/** Format seconds into MM:SS */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Process a single audio asset: generate via Replicate, upload to Firebase */
async function processAsset(
  item: { name: string; type: "music" | "ambient" | "sfx" | "dialogue"; duration: string; description: string; scenes: string[] },
  genre: string
): Promise<SoundAsset | null> {
  console.log(`🎧 Generating audio for: ${item.name}`);

  // Build concise prompt for Replicate (audio models work best with short, specific prompts)
  let prompt = `${item.description.slice(0, 300)}. `;
  switch (item.type) {
    case "music":
      prompt += `Cinematic ${genre} film score, professional orchestral quality.`;
      break;
    case "ambient":
      prompt += `Ambient soundscape for ${genre} film, immersive atmospheric audio.`;
      break;
    case "sfx":
      prompt += `Crisp sound effect for ${genre} film, clear and distinct.`;
      break;
    case "dialogue":
      prompt += `Spoken dialogue, ${genre} film tone, clear enunciation.`;
      break;
  }

  // Choose model and duration based on type
  let modelVersion = AUDIOGEN_VERSION;
  let genDuration = 10;
  if (item.type === "music") {
    modelVersion = MUSICGEN_VERSION;
    genDuration = 30;
  } else if (item.type === "dialogue" || item.type === "sfx") {
    genDuration = 5;
  }

  const { buffer, audioUrl: replicateUrl } = await generateAudioWithReplicate(
    prompt,
    genDuration,
    modelVersion
  );

  if (!replicateUrl || !buffer) {
    console.warn(`⚠️ Replicate returned no audio for ${item.name}. Skipping.`);
    return null;
  }

  let firebaseUrl = "";
  try {
    const filename = `${item.name.toLowerCase().replace(/\s/g, "-")}-${Date.now()}.mp3`;
    firebaseUrl = await uploadAudioFile(buffer, filename);
    console.log(`✅ Uploaded to Firebase: ${firebaseUrl}`);
  } catch (uploadErr) {
    console.warn(`⚠️ Firebase upload failed for ${item.name}. Falling back to Replicate URL.`, uploadErr);
  }

  const finalUrl = firebaseUrl || replicateUrl;
  if (!finalUrl) return null;

  return {
    name: item.name,
    type: item.type,
    duration: formatDuration(genDuration),
    description: item.description,
    scenes: item.scenes || ["Various Scenes"],
    audioUrl: finalUrl,
  };
}

/**
 * Generates AI sound assets with parallel processing:
 * 1. OpenAI generates asset ideas from script
 * 2. Replicate generates audio in parallel batches
 * 3. Firebase uploads for persistent URLs
 */
export async function generateAudioAssets(
  script: string,
  genre: string
): Promise<SoundAsset[]> {
  // Step 1: Generate sound asset ideas via OpenAI
  const { soundAssets: generatedIdeas } = await generateSoundAssets(script, genre);

  const ideas = generatedIdeas.length > 0 ? generatedIdeas : [
    {
      name: "Background Score",
      type: "music" as const,
      duration: "0:30",
      description: "A fitting cinematic score based on the script's mood and genre.",
      scenes: ["Main Scene"],
    },
  ];

  // Cap assets to fit within Vercel timeout
  const cappedIdeas = ideas.slice(0, MAX_ASSETS);
  console.log(`🎬 Processing ${cappedIdeas.length} assets (capped from ${ideas.length}) in batches of ${MAX_PARALLEL}`);

  // Step 2: Process in parallel batches
  const assets: SoundAsset[] = [];

  for (let i = 0; i < cappedIdeas.length; i += MAX_PARALLEL) {
    const batch = cappedIdeas.slice(i, i + MAX_PARALLEL);
    const results = await Promise.allSettled(
      batch.map((item) => processAsset(item, genre))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        assets.push(result.value);
        console.log(`✅ Added asset: ${result.value.name}`);
      } else if (result.status === "rejected") {
        console.error(`❌ Asset generation failed:`, result.reason);
      }
    }
  }

  console.log(`🎬 Final generated assets count: ${assets.length}`);
  return assets;
}
