import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import fetch from "node-fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboard } = body;

    if (!storyboard || !Array.isArray(storyboard) || storyboard.length === 0) {
      return NextResponse.json(
        { error: "No storyboard data provided for download." },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    // Add storyboard JSON metadata
    const storyboardData = {
      exportDate: new Date().toISOString(),
      totalFrames: storyboard.length,
      totalCoverageShots: storyboard.reduce(
        (sum: number, f: any) => sum + (f.coverageShots?.length || 0),
        0
      ),
      frames: storyboard.map((frame: any, i: number) => ({
        shotNumber: frame.shotNumber || `${i + 1}`,
        scene: frame.scene,
        description: frame.description,
        shotSize: frame.shotSize,
        cameraAngle: frame.cameraAngle,
        cameraMovement: frame.cameraMovement,
        lens: frame.lens,
        lighting: frame.lighting,
        composition: frame.composition,
        duration: frame.duration,
        dialogue: frame.dialogue,
        soundEffects: frame.soundEffects,
        actionNotes: frame.actionNotes,
        transition: frame.transition,
        notes: frame.notes,
        coverageShots: (frame.coverageShots || []).map((shot: any) => ({
          shotNumber: shot.shotNumber,
          description: shot.description,
          shotSize: shot.shotSize,
          cameraAngle: shot.cameraAngle,
          lens: shot.lens,
        })),
      })),
    };

    zip.file("storyboard.json", JSON.stringify(storyboardData, null, 2));

    // Create images subfolder
    const imagesFolder = zip.folder("storyboard_images");

    // Download main frame images
    for (let i = 0; i < storyboard.length; i++) {
      const frame = storyboard[i];
      if (frame.imageUrl) {
        try {
          const response = await fetch(frame.imageUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const shotId = (frame.shotNumber || `${i + 1}`).replace(/[^a-zA-Z0-9]/g, "_");
            imagesFolder?.file(`frame_${shotId}_main.png`, buffer);
          }
        } catch (err) {
          console.warn(`Failed to download frame image ${i + 1}:`, err);
        }
      }

      // Download coverage shot images
      if (frame.coverageShots && Array.isArray(frame.coverageShots)) {
        for (let j = 0; j < frame.coverageShots.length; j++) {
          const shot = frame.coverageShots[j];
          if (shot.imageUrl) {
            try {
              const response = await fetch(shot.imageUrl);
              if (response.ok) {
                const buffer = await response.arrayBuffer();
                const shotId = (shot.shotNumber || `${i + 1}-${j}`).replace(/[^a-zA-Z0-9]/g, "_");
                imagesFolder?.file(`frame_${shotId}.png`, buffer);
              }
            } catch (err) {
              console.warn(`Failed to download coverage shot image ${i + 1}-${j}:`, err);
            }
          }
        }
      }
    }

    const blob = await zip.generateAsync({ type: "arraybuffer" });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="storyboard_package.zip"',
      },
    });
  } catch (error: any) {
    console.error("Storyboard download error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate storyboard download package.",
      },
      { status: 500 }
    );
  }
}
