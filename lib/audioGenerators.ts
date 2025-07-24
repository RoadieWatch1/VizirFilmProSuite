// lib/audioGenerators.ts

import { uploadAudioFile } from "./firebaseUpload";
import { generateAudioWithReplicate } from "./replicate";

export type SoundAsset = {
  name: string;
  type: "music" | "ambient" | "sfx" | "dialogue";
  duration: string;
  description: string;
  scenes: string[];
  audioUrl: string;
};

/**
 * Generates AI sound assets using Replicate AudioGen and uploads them to Firebase.
 */
export async function generateTenseAudioAssets(
  script: string,
  genre: string
): Promise<SoundAsset[]> {
  const assets: SoundAsset[] = [];
  const safeScript = script.slice(0, 1500); // Avoid token overflow

  const prompts: Array<{
    name: string;
    type: "music" | "ambient" | "sfx" | "dialogue";
    prompt: string;
    duration: string;
    description: string;
    filename: string;
  }> = [
    {
      name: "Tense Background Score",
      type: "music",
      prompt: `A tense, cinematic ${genre} score. Based on this scene: ${safeScript}`,
      duration: "2:30",
      description: "A low, pulsating score with eerie strings that builds tension and suspense.",
      filename: "tense-score.mp3",
    },
    {
      name: "Flickering Bulb Hum",
      type: "ambient",
      prompt: `Flickering fluorescent bulb with a soft ambient hum in a suspenseful ${genre} setting. Scene: ${safeScript}`,
      duration: "2:00",
      description: "The low hum of a flickering light bulb, creating unease.",
      filename: "bulb-hum.mp3",
    },
    {
      name: "Footsteps on Concrete",
      type: "sfx",
      prompt: `Slow, echoing footsteps in an abandoned concrete hallway. Genre: ${genre}. Scene: ${safeScript}`,
      duration: "0:15",
      description: "Heavy footsteps echoing on hard floor.",
      filename: "footsteps.mp3",
    },
  ];

  for (const item of prompts) {
    try {
      console.log(`🎧 Generating audio for: ${item.name}`);
      const { buffer, audioUrl: replicateUrl } = await generateAudioWithReplicate(item.prompt);

      if (!replicateUrl || !buffer) {
        console.warn(`⚠️ Replicate returned no audio for ${item.name}. Skipping.`);
        continue;
      }

      let firebaseUrl = "";
      try {
        firebaseUrl = await uploadAudioFile(buffer, item.filename);
        console.log(`✅ Uploaded to Firebase: ${firebaseUrl}`);
      } catch (uploadErr) {
        console.warn(`⚠️ Firebase upload failed for ${item.name}. Falling back to Replicate URL.`, uploadErr);
      }

      const finalUrl = firebaseUrl || replicateUrl;

      if (!finalUrl) {
        console.warn(`⚠️ No usable URL for ${item.name}. Skipping.`);
        continue;
      }

      assets.push({
        name: item.name,
        type: item.type,
        duration: item.duration,
        description: item.description,
        scenes: ["INT. ABANDONED WAREHOUSE - NIGHT"], // Placeholder scene
        audioUrl: finalUrl,
      });

      console.log(`✅ Added asset: ${item.name}`);
    } catch (err) {
      console.error(`❌ Failed to generate or upload audio for: ${item.name}`, err);
    }
  }

  console.log(`🎬 Final generated assets count: ${assets.length}`);
  return assets;
}
