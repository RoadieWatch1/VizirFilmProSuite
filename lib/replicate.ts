// lib/replicate.ts
export async function generateAudioWithReplicate(prompt: string): Promise<{ buffer: ArrayBuffer; audioUrl: string }> {
  console.log("📡 [Replicate] Starting audio generation for prompt:", prompt);

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    throw new Error("❌ [Replicate] Missing REPLICATE_API_TOKEN in environment variables.");
  }

  // Step 1: Submit the request
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "f9045ac82e1f6f003adfb38d3f3fc11c2a5f81f3ee4df92c20cdd9c87cbd70ef",
      input: { prompt },
    }),
  });

  const prediction = await response.json();

  if (!prediction?.urls?.get) {
    console.error("❌ [Replicate] Failed to get prediction status URL:", prediction);
    throw new Error("Failed to start Replicate generation.");
  }

  const statusUrl = prediction.urls.get;

  // Step 2: Poll until the job completes
  let result;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
    });

    result = await statusRes.json();

    if (result.status === "succeeded") {
      console.log("✅ [Replicate] Generation succeeded!");
      break;
    }

    if (result.status === "failed") {
      console.error("❌ [Replicate] Generation failed:", result);
      throw new Error("Replicate audio generation failed.");
    }

    console.log(`⏳ [Replicate] Attempt ${attempts + 1}: Status = ${result.status}`);
    await new Promise((r) => setTimeout(r, 3000)); // Wait 3 seconds between polls
    attempts++;
  }

  if (!result?.output?.[0]) {
    console.error("❌ [Replicate] No audio output returned:", result);
    throw new Error("No audio output returned from Replicate.");
  }

  const audioUrl = result.output[0];
  console.log("🎧 [Replicate] Final audio URL:", audioUrl);

  const audioRes = await fetch(audioUrl);
  const buffer = await audioRes.arrayBuffer();

  return { buffer, audioUrl };
}
