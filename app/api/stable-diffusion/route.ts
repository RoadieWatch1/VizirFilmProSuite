// /app/api/stable-diffusion/route.ts

import Replicate from "replicate";

export const dynamic = "force-dynamic";

interface SDRequestBody {
  prompt: string;
  width?: number;
  height?: number;
  numOutputs?: number;
  seed?: number;
}

interface SDResponse {
  images: string[];
  provider: "replicate";
}

export async function POST(req: Request): Promise<Response> {
  const requestId = Math.random().toString(36).substring(2, 10);

  try {
    const body = (await req.json()) as SDRequestBody;
    const { prompt, width, height, numOutputs, seed } = body;

    if (!prompt) {
      return jsonError("Missing prompt.", 400, requestId);
    }

    const replicateApiKey = process.env.REPLICATE_API_KEY;
    if (!replicateApiKey) {
      return jsonError("Missing Replicate API key.", 500, requestId);
    }

    const replicate = new Replicate({
      auth: replicateApiKey,
    });

    console.log(`[${requestId}] Sending prompt to Replicate SDXL:`, prompt);

    const result = await replicate.run(
      "stability-ai/sdxl:latest",
      {
        input: {
          prompt,
          width: width || 512,
          height: height || 512,
          num_outputs: numOutputs || 1,
          seed: seed || undefined,
        }
      }
    );

    console.log(`[${requestId}] Raw Replicate result:`, result);

    let imageUrls: string[] = [];

    if (Array.isArray(result)) {
      // Most typical case for Replicate SDXL
      imageUrls = result.filter((x) => typeof x === "string");
    } else if (
      result &&
      typeof result === "object" &&
      "output" in result &&
      Array.isArray((result as any).output)
    ) {
      // Some models may return { output: [...] }
      imageUrls = (result as any).output.filter((x: any) => typeof x === "string");
    } else if (
      result &&
      typeof result === "object" &&
      "paths" in result &&
      typeof (result as any).paths?.output === "string"
    ) {
      // Very rare older shape: { paths: { output: "url" } }
      imageUrls.push((result as any).paths.output);
    }

    if (imageUrls.length === 0) {
      console.warn(`[${requestId}] No images returned from Replicate.`);
      return jsonError("Stable Diffusion returned no images.", 500, requestId);
    }

    console.log(`[${requestId}] SDXL images generated:`, imageUrls);

    const response: SDResponse = {
      images: imageUrls,
      provider: "replicate",
    };

    return jsonOK(response, requestId);

  } catch (error: any) {
    console.error(`[${requestId}] Stable Diffusion error:`, error);
    return jsonError(
      error?.message || "Failed to generate images.",
      500,
      requestId
    );
  }
}

function jsonOK(data: any, requestId: string) {
  return new Response(
    JSON.stringify({ requestId, ...data }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

function jsonError(message: string, status: number, requestId: string) {
  return new Response(
    JSON.stringify({ requestId, error: message }),
    {
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
}
