// lib/replicate.ts

export async function generateAudioWithReplicate(prompt: string): Promise<{ buffer: ArrayBuffer, audioUrl: string }> {
  console.log("📡 [Replicate] Starting audio generation for prompt:", prompt);

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    throw new Error("❌ [Replicate] Missing REPLICATE_API_TOKEN in environment variables.");
  }

  // 1. Submit prompt to Replicate's AudioGen model
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "f9045ac82e1f6f003adfb38d3f3fc11c2a5f81f3ee4df92c20cdd9c87cbd70ef", // AudioGen v1.1
      input: { prompt },
    }),
  });

  const prediction = await response.json();

  if (!prediction?.urls?.get) {
    console.error("❌ [Replicate] Failed to get prediction status URL:", prediction);
    throw new Error("Failed to start Replicate generation.");
  }

  const statusUrl = prediction.urls.get;

  // 2. Poll status until completed
  let result;
  while (true) {
    const statusRes = await fetch(statusUrl, {
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
    });

    result = await statusRes.json();

    if (result.status === "succeeded") break;
    if (result.status === "failed") {
      console.error("❌ [Replicate] Generation failed:", result);
      throw new Error("Replicate audio generation failed.");
    }

    console.log("⏳ [Replicate] Still processing...");
    await new Promise((r) => setTimeout(r, 2000)); // Wait 2 seconds before checking again
  }

  // 3. Extract audio URL and fetch the audio file
  const audioUrl = result.output?.[0];
  if (!audioUrl) {
    console.error("❌ [Replicate] No audio URL found in result:", result);
    throw new Error("No audio output returned from Replicate.");
  }

  console.log("✅ [Replicate] Audio generated at:", audioUrl);

  const audioRes = await fetch(audioUrl);
  const buffer = await audioRes.arrayBuffer();

  return { buffer, audioUrl };
}
