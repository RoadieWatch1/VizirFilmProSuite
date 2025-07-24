// lib/replicate.ts

export async function generateAudioWithReplicate(
  prompt: string
): Promise<{ buffer: ArrayBuffer; audioUrl: string }> {
  console.log("📡 [Replicate] Starting audio generation for prompt:", prompt);

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    throw new Error("❌ [Replicate] Missing REPLICATE_API_TOKEN in environment variables.");
  }

  // Call the sepal/audiogen model
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "154b3e5141493cb1b8cec976d9aa90f2b691137e39ad906d2421b74c2a8c52b8", // ✅ sepal/audiogen
      input: {
        prompt,
        duration: 5,
        output_format: "mp3",
      },
    }),
  });

  const prediction = await response.json();

  if (!response.ok) {
    console.error("❌ [Replicate] API Error:", prediction);
    throw new Error(prediction?.detail || "Failed to start Replicate generation.");
  }

  const statusUrl = prediction?.urls?.get;
  if (!statusUrl) {
    console.error("❌ [Replicate] Missing status polling URL:", prediction);
    throw new Error("Missing Replicate polling URL.");
  }

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

  if (!result?.output) {
    console.error("❌ [Replicate] No audio output:", result);
    throw new Error("Replicate did not return any audio output.");
  }

  const audioUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  console.log("🎧 [Replicate] Final audio URL:", audioUrl);

  const audioRes = await fetch(audioUrl);
  const buffer = await audioRes.arrayBuffer();

  return { buffer, audioUrl };
}
