// lib/audioGenerators.ts
import { uploadAudioFile } from "./firebaseUpload";
import { generateAudioWithReplicate } from "./replicate";
import { generateSoundAssets } from "./generators"; // Import the dynamic generator

export type SoundAsset = {
  name: string;
  type: "music" | "ambient" | "sfx" | "dialogue";
  duration: string;
  description: string;
  scenes: string[];
  audioUrl: string;
};

/**
 * Generates AI sound assets dynamically based on the script and genre using OpenAI for asset ideas,
 * then Replicate AudioGen for audio generation, and uploads them to Firebase.
 */
export async function generateAudioAssets(
  script: string,
  genre: string
): Promise<SoundAsset[]> {
  const assets: SoundAsset[] = [];
  const safeScript = script.slice(0, 1500); // Avoid token overflow

  // Step 1: Dynamically generate sound asset ideas using OpenAI
  const { soundAssets: generatedIdeas } = await generateSoundAssets(script, genre);
  
  // Ensure we have ideas, fallback to a minimal set if none generated
  const ideas = generatedIdeas.length > 0 ? generatedIdeas : [
    {
      name: "Background Score",
      type: "music" as const,
      duration: "2:30",
      description: "A fitting score based on the script's mood.",
      scenes: ["Main Scene"],
    },
  ];

  for (const item of ideas) {
    try {
      console.log(`🎧 Generating audio for: ${item.name}`);

      // Step 2: Create a dynamic prompt based on the generated idea, genre, and script
      let prompt = `${item.description}. `;
      switch (item.type) {
        case "music":
          prompt += `A cinematic ${genre} score with appropriate instruments and tempo. `;
          break;
        case "ambient":
          prompt += `Ambient sounds for a ${genre} setting, including background tones and atmosphere. `;
          break;
        case "sfx":
          prompt += `Specific sound effects for actions in a ${genre} context. `;
          break;
        case "dialogue":
          prompt += `Spoken dialogue or voice elements in a ${genre} style. `;
          break;
      }
      prompt += `Inspired by ${genre} films. Scene context: ${safeScript.slice(0, 500)}.`;

      const { buffer, audioUrl: replicateUrl } = await generateAudioWithReplicate(prompt);

      if (!replicateUrl || !buffer) {
        console.warn(`⚠️ Replicate returned no audio for ${item.name}. Skipping.`);
        continue;
      }

      let firebaseUrl = "";
      try {
        const filename = `${item.name.toLowerCase().replace(/\s/g, "-")}.mp3`;
        firebaseUrl = await uploadAudioFile(buffer, filename);
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
        scenes: item.scenes || ["Various Scenes"], // Fallback if missing
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