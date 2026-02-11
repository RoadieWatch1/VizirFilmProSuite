// lib/replicate.ts

const MAX_POLL_ATTEMPTS = 40; // 40 * 3s = 2 min max per asset
const POLL_INTERVAL_MS = 3000;

export async function generateAudioWithReplicate(
  prompt: string,
  duration: number = 10,
  modelVersion: string = "154b3e5141493cb1b8cec976d9aa90f2b691137e39ad906d2421b74c2a8c52b8"
): Promise<{ buffer: ArrayBuffer; audioUrl: string }> {
  console.log("📡 [Replicate] Starting audio generation...");

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN in environment variables.");
  }

  // Start prediction
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        prompt,
        duration,
        output_format: "mp3",
      },
    }),
  });

  const prediction = await response.json();

  if (!response.ok) {
    console.error("[Replicate] API Error:", prediction);
    throw new Error(prediction?.detail || "Failed to start Replicate generation.");
  }

  const statusUrl = prediction?.urls?.get;
  if (!statusUrl) {
    console.error("[Replicate] Missing status polling URL:", prediction);
    throw new Error("Missing Replicate polling URL.");
  }

  // Poll for completion with timeout
  let result;
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    const statusRes = await fetch(statusUrl, {
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
    });

    result = await statusRes.json();

    if (result.status === "succeeded") {
      console.log("[Replicate] Generation succeeded!");
      break;
    }

    if (result.status === "failed" || result.status === "canceled") {
      console.error("[Replicate] Generation failed:", result.error || result.status);
      throw new Error(`Replicate audio generation ${result.status}.`);
    }

    console.log(`⏳ [Replicate] Poll ${attempts + 1}/${MAX_POLL_ATTEMPTS}: ${result.status}`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    attempts++;
  }

  if (attempts >= MAX_POLL_ATTEMPTS) {
    throw new Error("Replicate audio generation timed out after polling.");
  }

  if (!result?.output) {
    console.error("[Replicate] No audio output:", result);
    throw new Error("Replicate did not return any audio output.");
  }

  const audioUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  console.log("[Replicate] Final audio URL:", audioUrl);

  const audioRes = await fetch(audioUrl);
  const buffer = await audioRes.arrayBuffer();

  return { buffer, audioUrl };
}
