import { NextRequest, NextResponse } from "next/server";
import { generateTenseAudioAssets } from "@/lib/audioGenerators";

export async function POST(request: NextRequest) {
  try {
    console.log("📥 [API] Sound generation request received");

    const body = await request.json();
    const { script, genre } = body;

    if (!script || !genre) {
      console.warn("⚠️ Missing script or genre in request body");
      return NextResponse.json(
        { error: "Missing required fields: script and genre." },
        { status: 400 }
      );
    }

    console.log("🧠 [API] Generating with genre:", genre);
    console.log("📝 [API] Using script preview:", script.slice(0, 100) + "...");

    const rawAssets = await generateTenseAudioAssets(script, genre);

    // Filter out any failed assets
    const soundAssets = rawAssets.filter((a) => !!a.audioUrl);

    console.log("🎧 [API] Total generated:", rawAssets.length);
    rawAssets.forEach((a, i) => {
      console.log(`  - Asset ${i + 1}: ${a.name}, URL: ${a.audioUrl || "❌ No URL"}`);
    });

    return NextResponse.json({
      success: true,
      message: "Sound assets generated successfully.",
      soundAssets,
    });

  } catch (error: any) {
    console.error("❌ [API] Sound generation error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate sound assets. Please try again.",
      },
      { status: 500 }
    );
  }
}
