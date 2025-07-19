// C:\Users\vizir\VizirPro\app\api\sound\route.ts

import { NextRequest, NextResponse } from "next/server";
import { generateTenseAudioAssets } from "@/lib/audioGenerators";

export async function POST(request: NextRequest) {
  try {
    console.log("📥 [API] Sound generation request received");

    const body = await request.json();
    const { script, genre } = body;

    if (!script || !genre) {
      return NextResponse.json(
        { error: "Missing required fields: script and genre." },
        { status: 400 }
      );
    }

    const soundAssets = await generateTenseAudioAssets(script, genre);

    console.log("✅ [API] Generated sound assets:", soundAssets);

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
