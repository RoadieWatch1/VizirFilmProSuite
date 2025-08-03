// C:\Users\vizir\VizirPro\app\api\export\route.ts
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import fetch from "node-fetch";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedOptions, filmPackage } = body;

    if (!selectedOptions || selectedOptions.length === 0 || !filmPackage) {
      return NextResponse.json(
        { error: "Selected options and film package are required." },
        { status: 400 }
      );
    }

    // Initialize ZIP file
    const zip = new JSZip();

    // Generate text-based export content
    let exportContent = "=========================\nVIZIR FILM PRO EXPORT\n=========================\n\n";
    const imageFolder = zip.folder("images");

    // Process selected options
    for (const option of selectedOptions) {
      switch (option) {
        case "script":
          exportContent += `Script:\n${filmPackage.script || "No script available"}\n\n`;
          zip.file("script.txt", filmPackage.script || "No script available");
          break;
        case "storyboard":
          exportContent += `Storyboard:\n${JSON.stringify(filmPackage.storyboard || [], null, 2)}\n\n`;
          zip.file("storyboard.json", JSON.stringify(filmPackage.storyboard || [], null, 2));
          // Add storyboard images
          if (filmPackage.storyboard && Array.isArray(filmPackage.storyboard)) {
            for (let i = 0; i < filmPackage.storyboard.length; i++) {
              const frame = filmPackage.storyboard[i];
              if (frame.imageUrl) {
                try {
                  const response = await fetch(frame.imageUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    imageFolder?.file(`storyboard_frame_${i + 1}.png`, buffer);
                  }
                } catch (err) {
                  console.error(`Failed to fetch storyboard image ${frame.imageUrl}:`, err);
                }
              }
              if (frame.coverageShots && Array.isArray(frame.coverageShots)) {
                for (let j = 0; j < frame.coverageShots.length; j++) {
                  const shot = frame.coverageShots[j];
                  if (shot.imageUrl) {
                    try {
                      const response = await fetch(shot.imageUrl);
                      if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        imageFolder?.file(`storyboard_frame_${i + 1}_shot_${j + 1}.png`, buffer);
                      }
                    } catch (err) {
                      console.error(`Failed to fetch coverage shot image ${shot.imageUrl}:`, err);
                    }
                  }
                }
              }
            }
          }
          break;
        case "budget":
          exportContent += `Budget:\n${JSON.stringify(filmPackage.budget || [], null, 2)}\n\n`;
          zip.file("budget.json", JSON.stringify(filmPackage.budget || [], null, 2));
          break;
        case "schedule":
          exportContent += `Schedule:\n${JSON.stringify(filmPackage.schedule || [], null, 2)}\n\n`;
          zip.file("schedule.json", JSON.stringify(filmPackage.schedule || [], null, 2));
          break;
        case "characters":
          exportContent += `Characters:\n${JSON.stringify(filmPackage.characters || [], null, 2)}\n\n`;
          zip.file("characters.json", JSON.stringify(filmPackage.characters || [], null, 2));
          // Add character images
          if (filmPackage.characters && Array.isArray(filmPackage.characters)) {
            for (let i = 0; i < filmPackage.characters.length; i++) {
              const character = filmPackage.characters[i];
              if (character.imageUrl) {
                try {
                  const response = await fetch(character.imageUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    imageFolder?.file(`character_${character.name.replace(/\s+/g, "_")}.png`, buffer);
                  }
                } catch (err) {
                  console.error(`Failed to fetch character image ${character.imageUrl}:`, err);
                }
              }
            }
          }
          break;
        case "locations":
          exportContent += `Locations:\n${JSON.stringify(filmPackage.locations || [], null, 2)}\n\n`;
          zip.file("locations.json", JSON.stringify(filmPackage.locations || [], null, 2));
          break;
        case "complete":
          exportContent += `Complete Package:\n${JSON.stringify(filmPackage, null, 2)}\n\n`;
          zip.file("complete_package.json", JSON.stringify(filmPackage, null, 2));
          // Add all images for complete package
          if (filmPackage.characters && Array.isArray(filmPackage.characters)) {
            for (let i = 0; i < filmPackage.characters.length; i++) {
              const character = filmPackage.characters[i];
              if (character.imageUrl) {
                try {
                  const response = await fetch(character.imageUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    imageFolder?.file(`character_${character.name.replace(/\s+/g, "_")}.png`, buffer);
                  }
                } catch (err) {
                  console.error(`Failed to fetch character image ${character.imageUrl}:`, err);
                }
              }
            }
          }
          if (filmPackage.storyboard && Array.isArray(filmPackage.storyboard)) {
            for (let i = 0; i < filmPackage.storyboard.length; i++) {
              const frame = filmPackage.storyboard[i];
              if (frame.imageUrl) {
                try {
                  const response = await fetch(frame.imageUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    imageFolder?.file(`storyboard_frame_${i + 1}.png`, buffer);
                  }
                } catch (err) {
                  console.error(`Failed to fetch storyboard image ${frame.imageUrl}:`, err);
                }
              }
              if (frame.coverageShots && Array.isArray(frame.coverageShots)) {
                for (let j = 0; j < frame.coverageShots.length; j++) {
                  const shot = frame.coverageShots[j];
                  if (shot.imageUrl) {
                    try {
                      const response = await fetch(shot.imageUrl);
                      if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        imageFolder?.file(`storyboard_frame_${i + 1}_shot_${j + 1}.png`, buffer);
                      }
                    } catch (err) {
                      console.error(`Failed to fetch coverage shot image ${shot.imageUrl}:`, err);
                    }
                  }
                }
              }
            }
          }
          break;
        default:
          break;
      }
    }

    exportContent += `\nGenerated on: ${new Date().toISOString()}\nReady for production planning and collaboration.`;
    zip.file("export_summary.txt", exportContent);

    // Generate the ZIP file
    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    // Return the ZIP file as a response
    return new NextResponse(zipContent, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=vizir_film_export.zip",
      },
    });
  } catch (error: any) {
    console.error("Export generation error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to generate export package. Please try again later.",
      },
      { status: 500 }
    );
  }
}