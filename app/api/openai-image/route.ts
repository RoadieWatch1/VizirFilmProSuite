// /app/api/openai-image/route.ts

import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt." }),
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    // ✅ SAFE CHECK:
    if (!completion.data || completion.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images returned from OpenAI." }),
        { status: 500 }
      );
    }

    const urls = completion.data
      .filter((img) => img.url)
      .map((img) => img.url as string);

    return new Response(
      JSON.stringify({ images: urls }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("OpenAI image route error:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Internal Server Error" }),
      { status: 500 }
    );
  }
}
