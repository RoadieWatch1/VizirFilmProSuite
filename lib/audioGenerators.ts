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
      prompt: `A suspenseful, cinematic score with low, pulsing synthesizers, deep cellos, and eerie string harmonics. The sound builds gradually with heartbeat-like percussion, echoing tension, and minor chord progressions. Inspired by classic ${genre} thriller soundtracks. Scene inspiration: ${safeScript}`,
      duration: "2:30",
      description: "A low, pulsating score with eerie strings and heartbeat-like drums that builds tension and suspense.",
      filename: "tense-score.mp3",
    },
    {
      name: "Flickering Bulb Hum",
      type: "ambient",
      prompt: `The distant hum of an old, flickering fluorescent bulb in an empty industrial space. Random flicker sounds with slight electronic buzz and background air tone. Some high-pitched whining and voltage irregularity. Set in a creepy ${genre} warehouse scene. Context: ${safeScript}`,
      duration: "2:00",
      description: "The electrical buzz and uneven flickering sound of a faulty ceiling bulb creating an ominous hum in a large empty space.",
      filename: "bulb-hum.mp3",
    },
    {
      name: "Footsteps on Concrete",
      type: "sfx",
      prompt: `Heavy, slow footsteps on hard concrete in a narrow corridor. Each step is deliberate and echoes with metallic reverb, suggesting an abandoned facility. The sound has a slight drag and dust crunch with each footfall. Based on a ${genre} suspense scene. Context: ${safeScript}`,
      duration: "0:15",
      description: "Slow, deliberate footsteps on a concrete floor that echo through an abandoned hallway, creating suspense.",
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
