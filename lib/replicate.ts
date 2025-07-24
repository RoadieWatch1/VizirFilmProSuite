// lib/replicate.ts
export async function generateAudioWithReplicate(prompt: string): Promise<{ buffer: ArrayBuffer; audioUrl: string }> {
  console.log("📡 [Replicate] Starting audio generation for prompt:", prompt);

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    throw new Error("❌ [Replicate] Missing REPLICATE_API_TOKEN in environment variables.");
  }

  // Submit the audio generation request to Replicate
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "a6f56cd6d8f993f4acac8ec27f4c0e3d8f702e41f3403e7fc6b9f9301f13449d",
      input: {
        prompt,
      },
    }),
  });

  const prediction = await response.json();

  if (!response.ok) {
    console.error("❌ [Replicate] API Error Response:", prediction);
    throw new Error("Failed to start Replicate generation.");
  }

  if (!prediction?.urls?.get) {
    console.error("❌ [Replicate] No status URL returned:", prediction);
    throw new Error("Invalid Replicate response: missing status URL.");
  }

  const statusUrl = prediction.urls.get;

  let result;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    const statusRes = await fetch(statusUrl, {
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
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
    await new Promise((r) => setTimeout(r, 3000));
    attempts++;
  }

  if (!result?.output?.[0]) {
    console.error("❌ [Replicate] No output returned:", result);
    throw new Error("No audio output returned from Replicate.");
  }

  const audioUrl = result.output[0];
  console.log("🎧 [Replicate] Final audio URL:", audioUrl);

  const audioRes = await fetch(audioUrl);
  const buffer = await audioRes.arrayBuffer();

  return { buffer, audioUrl };
}
