// C:\Users\vizir\VizirPro\app\api\export\route.ts
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import fetch from "node-fetch";
import { scriptToFdx, scriptToFountain, type TitlePage } from "@/lib/scriptParser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function buildTitlePage(filmPackage: any): TitlePage {
  const date = new Date();
  const draftDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    title: (filmPackage?.idea || "").trim() || undefined,
    author: "Generated with VizirPro",
    draftDate,
  };
}

function slugify(input: string, fallback: string): string {
  const s = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return s || fallback;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedOptions, filmPackage, format } = body as {
      selectedOptions?: string[];
      filmPackage?: any;
      format?: "fdx" | "fountain";
    };

    if (!filmPackage) {
      return NextResponse.json(
        { error: "Film package is required." },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────────────────
    // Single-file screenplay exports (Final Draft / Fountain)
    // ─────────────────────────────────────────────────────────
    if (format === "fdx" || format === "fountain") {
      const script = typeof filmPackage.script === "string" ? filmPackage.script : "";
      if (!script.trim()) {
        return NextResponse.json(
          { error: "No screenplay to export. Generate a script first." },
          { status: 400 },
        );
      }
      const titlePage = buildTitlePage(filmPackage);
      const slug = slugify(filmPackage?.idea, "screenplay");
      if (format === "fdx") {
        const xml = scriptToFdx(script, titlePage);
        return new NextResponse(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Content-Disposition": `attachment; filename="${slug}.fdx"`,
            "Cache-Control": "no-store",
          },
        });
      }
      const fountain = scriptToFountain(script, titlePage);
      return new NextResponse(fountain, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}.fountain"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (!selectedOptions || selectedOptions.length === 0) {
      return NextResponse.json(
        { error: "Selected options are required." },
        { status: 400 },
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
          if (filmPackage.script) {
            try {
              const tp = buildTitlePage(filmPackage);
              zip.file("script.fountain", scriptToFountain(filmPackage.script, tp));
              zip.file("script.fdx", scriptToFdx(filmPackage.script, tp));
            } catch (err) {
              console.error("Pro screenplay export failed:", err);
            }
          }
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
        case "coverage":
          if (filmPackage.coverage) {
            exportContent += `Script Coverage:\n${JSON.stringify(filmPackage.coverage, null, 2)}\n\n`;
            zip.file("coverage.json", JSON.stringify(filmPackage.coverage, null, 2));
          }
          break;
        case "shotlist":
          if (filmPackage.shotList) {
            exportContent += `Shot List:\n${JSON.stringify(filmPackage.shotList, null, 2)}\n\n`;
            zip.file("shotlist.json", JSON.stringify(filmPackage.shotList, null, 2));
          }
          break;
        case "pitch-deck":
          if (filmPackage.directorStatement) {
            exportContent += `Director's Statement:\n${JSON.stringify(filmPackage.directorStatement, null, 2)}\n\n`;
            zip.file("director_statement.json", JSON.stringify(filmPackage.directorStatement, null, 2));
          }
          break;
        case "social":
          if (filmPackage.socialPackage) {
            exportContent += `Social Package:\n${JSON.stringify(filmPackage.socialPackage, null, 2)}\n\n`;
            zip.file("social_package.json", JSON.stringify(filmPackage.socialPackage, null, 2));
          }
          break;
        case "distribution":
          if (filmPackage.distribution) {
            exportContent += `Distribution Strategy:\n${JSON.stringify(filmPackage.distribution, null, 2)}\n\n`;
            zip.file("distribution.json", JSON.stringify(filmPackage.distribution, null, 2));
          }
          break;
        case "vision-board":
          if (filmPackage.visionBoard) {
            exportContent += `Vision Board:\n${JSON.stringify(filmPackage.visionBoard, null, 2)}\n\n`;
            zip.file("vision_board.json", JSON.stringify(filmPackage.visionBoard, null, 2));
            const vbPrompts = filmPackage.visionBoard.prompts || [];
            for (let i = 0; i < vbPrompts.length; i++) {
              const p = vbPrompts[i];
              if (p?.imageUrl) {
                try {
                  const response = await fetch(p.imageUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const slug = (p.category || "panel").replace(/[^a-z0-9]+/gi, "_");
                    imageFolder?.file(
                      `visionboard_${String(i + 1).padStart(2, "0")}_${slug}.png`,
                      buffer,
                    );
                  }
                } catch (err) {
                  console.error(`Failed to fetch vision board image ${p.imageUrl}:`, err);
                }
              }
            }
          }
          break;
        case "complete":
          exportContent += `Complete Package:\n${JSON.stringify(filmPackage, null, 2)}\n\n`;
          zip.file("complete_package.json", JSON.stringify(filmPackage, null, 2));
          if (filmPackage.coverage) zip.file("coverage.json", JSON.stringify(filmPackage.coverage, null, 2));
          if (filmPackage.shotList) zip.file("shotlist.json", JSON.stringify(filmPackage.shotList, null, 2));
          if (filmPackage.directorStatement) zip.file("director_statement.json", JSON.stringify(filmPackage.directorStatement, null, 2));
          if (filmPackage.socialPackage) zip.file("social_package.json", JSON.stringify(filmPackage.socialPackage, null, 2));
          if (filmPackage.distribution) zip.file("distribution.json", JSON.stringify(filmPackage.distribution, null, 2));
          if (filmPackage.visionBoard) {
            zip.file("vision_board.json", JSON.stringify(filmPackage.visionBoard, null, 2));
            const vbPrompts = filmPackage.visionBoard.prompts || [];
            for (let i = 0; i < vbPrompts.length; i++) {
              const p = vbPrompts[i];
              if (p?.imageUrl) {
                try {
                  const response = await fetch(p.imageUrl);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const slug = (p.category || "panel").replace(/[^a-z0-9]+/gi, "_");
                    imageFolder?.file(
                      `visionboard_${String(i + 1).padStart(2, "0")}_${slug}.png`,
                      buffer,
                    );
                  }
                } catch (err) {
                  console.error(`Failed to fetch vision board image ${p.imageUrl}:`, err);
                }
              }
            }
          }
          if (filmPackage.script) {
            try {
              const tp = buildTitlePage(filmPackage);
              zip.file("script.txt", filmPackage.script);
              zip.file("script.fountain", scriptToFountain(filmPackage.script, tp));
              zip.file("script.fdx", scriptToFdx(filmPackage.script, tp));
            } catch (err) {
              console.error("Pro screenplay export failed:", err);
            }
          }
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