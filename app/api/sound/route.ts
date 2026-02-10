// app/api/sound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateAudioAssets } from "@/lib/audioGenerators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

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

    const rawAssets = await generateAudioAssets(script, genre); // Updated function call

    const soundAssets = rawAssets.filter((a) => !!a.audioUrl);

    console.log("🎧 [API] Total generated:", rawAssets.length);
    rawAssets.forEach((a, i) => {
      console.log(`  - Asset ${i + 1}: ${a.name}`);
      if (a.audioUrl) {
        console.log(`    ✅ URL: ${a.audioUrl}`);
      } else {
        console.warn(`    ❌ Failed to generate audio for "${a.name}"`);
      }
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
        success: false,
        error: error?.message || "Unexpected error occurred during sound generation.",
      },
      { status: 500 }
    );
  }
}