import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import fetch from "node-fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soundAssets } = body;

    if (
      !soundAssets ||
      !Array.isArray(soundAssets) ||
      soundAssets.length === 0
    ) {
      return NextResponse.json(
        { error: "No sound assets provided for download." },
        { status: 400 }
      );
    }

    // Create ZIP archive
    const zip = new JSZip();

    // Add sound assets JSON metadata
    const soundData = {
      exportDate: new Date().toISOString(),
      totalAssets: soundAssets.length,
      breakdown: {
        music: soundAssets.filter((a: any) => a.type === "music").length,
        sfx: soundAssets.filter((a: any) => a.type === "sfx").length,
        dialogue: soundAssets.filter((a: any) => a.type === "dialogue").length,
        ambient: soundAssets.filter((a: any) => a.type === "ambient").length,
      },
      assets: soundAssets.map((asset: any) => ({
        name: asset.name,
        type: asset.type,
        duration: asset.duration,
        description: asset.description,
        scenes: asset.scenes || [],
      })),
    };

    zip.file("sound_design.json", JSON.stringify(soundData, null, 2));

    // Create an audio subfolder
    const audioFolder = zip.folder("audio_files");

    // Download and add audio files
    let successCount = 0;
    for (let i = 0; i < soundAssets.length; i++) {
      const asset = soundAssets[i];
      if (asset.audioUrl) {
        try {
          const response = await fetch(asset.audioUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const safeFileName = asset.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "_")
              .replace(/_+/g, "_");
            const extension = asset.audioUrl.includes(".wav") ? "wav" : "mp3";
            audioFolder?.file(
              `${i + 1}_${safeFileName}.${extension}`,
              buffer
            );
            successCount++;
            console.log(
              `✅ Downloaded audio for ${asset.name} (${asset.duration})`
            );
          } else {
            console.warn(`⚠️ Failed to download audio for ${asset.name}`);
          }
        } catch (err) {
          console.warn(
            `⚠️ Error downloading audio for ${asset.name}:`,
            err
          );
        }
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        {
          error: "No audio files could be downloaded. Assets may not be generated yet.",
        },
        { status: 400 }
      );
    }

    // Generate and send ZIP
    const blob = await zip.generateAsync({ type: "arraybuffer" });
    const buffer = Buffer.from(blob);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="sound_design_package.zip"',
      },
    });
  } catch (error: any) {
    console.error("❌ Sound asset download error:", error);
    return NextResponse.json(
      {
        error:
          error?.message || "Failed to generate sound asset download package.",
      },
      { status: 500 }
    );
  }
}
