import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads an audio file to Firebase Storage and returns the public download URL.
 *
 * @param buffer - The audio file buffer (e.g., from a generated Blob)
 * @param filename - Desired filename (e.g., 'tense-score.mp3')
 * @param contentType - MIME type of the audio (default is "audio/mpeg")
 * @returns {Promise<string>} - The public download URL
 */
export async function uploadAudioFile(
  buffer: ArrayBuffer,
  filename: string,
  contentType: string = "audio/mpeg"
): Promise<string> {
  const audioRef = ref(storage, `audio-assets/${filename}`);
  const metadata = { contentType };
  const uploadResult = await uploadBytes(audioRef, new Uint8Array(buffer), metadata);
  const downloadUrl = await getDownloadURL(uploadResult.ref);
  return downloadUrl;
}

