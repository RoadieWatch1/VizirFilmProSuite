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

const AUDIOGEN_VERSION = "154b3e5141493cb1b8cec976d9aa90f2b691137e39ad906d2421b74c2a8c52b8"; // sepal/audiogen
const MUSICGEN_VERSION = "7a76a8258b23fae65c5a22debb8841d1d7e816b75c2f24218cd2bd8573787906"; // meta/musicgen

/**
 * Generates AI sound assets dynamically based on the script and genre using OpenAI for asset ideas,
 * then appropriate Replicate model for audio generation (MusicGen for music, AudioGen for others), and uploads them to Firebase.
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
          prompt += `A cinematic ${genre} music track with appropriate instruments, melody, and tempo. `;
          break;
        case "ambient":
          prompt += `Ambient sounds for a ${genre} setting, including detailed background tones, atmospheres, and subtle noises. `;
          break;
        case "sfx":
          prompt += `Specific sound effects for actions in a ${genre} context, with clear and distinct audio elements. `;
          break;
        case "dialogue":
          prompt += `Spoken dialogue in a ${genre} style, with clear enunciation and appropriate tone. Note: For best results, describe the voice and words precisely. `;
          break;
      }
      prompt += `Inspired by classic ${genre} films. Highly detailed for accuracy. Scene context: ${safeScript}.`; // Use full safeScript for more context

      // Choose model and duration based on type
      let modelVersion = AUDIOGEN_VERSION;
      let genDuration = 10; // Max for AudioGen
      if (item.type === "music") {
        modelVersion = MUSICGEN_VERSION;
        genDuration = 30; // Max for MusicGen
      } else if (item.type === "dialogue" || item.type === "sfx") {
        genDuration = 5; // Shorter for SFX and dialogue
      }

      const { buffer, audioUrl: replicateUrl } = await generateAudioWithReplicate(
        prompt,
        genDuration,
        modelVersion
      );

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
        duration: item.duration, // Keep the metadata duration
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