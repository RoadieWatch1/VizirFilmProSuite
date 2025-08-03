// C:\Users\vizir\VizirPro\app\api\export\route.ts
import { NextRequest, NextResponse } from "next/server";
import { useFilmStore } from "@/lib/store"; // Note: Server-side, so we can't use client-side store directly; receive data in body

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedOptions, filmPackage } = body; // Receive selected options and filmPackage from client

    if (!selectedOptions || selectedOptions.length === 0 || !filmPackage) {
      return NextResponse.json(
        { error: "Selected options and film package are required." },
        { status: 400 }
      );
    }

    // Generate export content based on selected options
    let exportContent = "=========================\nVIZIR FILM PRO EXPORT\n=========================\n\n";

    selectedOptions.forEach((option: string) => {
      switch (option) {
        case "script":
          exportContent += `Script:\n${filmPackage.script || "No script available"}\n\n`;
          break;
        case "storyboard":
          exportContent += `Storyboard:\n${JSON.stringify(filmPackage.storyboard || [], null, 2)}\n\n`;
          break;
        case "budget":
          exportContent += `Budget:\n${JSON.stringify(filmPackage.budget || [], null, 2)}\n\n`;
          break;
        case "schedule":
          exportContent += `Schedule:\n${JSON.stringify(filmPackage.schedule || [], null, 2)}\n\n`;
          break;
        case "characters":
          exportContent += `Characters:\n${JSON.stringify(filmPackage.characters || [], null, 2)}\n\n`;
          break;
        case "locations":
          exportContent += `Locations:\n${JSON.stringify(filmPackage.locations || [], null, 2)}\n\n`;
          break;
        case "complete":
          exportContent += `Complete Package:\n${JSON.stringify(filmPackage, null, 2)}\n\n`;
          break;
        default:
          break;
      }
    });

    exportContent += `\nGenerated on: ${new Date().toISOString()}\nReady for production planning and collaboration.`;

    return NextResponse.json({ exportPackage: exportContent });
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