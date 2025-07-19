import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { movieIdea, movieGenre, scriptLength } = body;

    if (!movieIdea || !movieGenre || !scriptLength) {
      return NextResponse.json(
        { error: "Movie idea, genre, and script length are required." },
        { status: 400 }
      );
    }

    // Simulate export package generation (e.g. PDF, ZIP)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const exportPackage = `
=========================
VIZIR FILM PRO EXPORT
=========================

Title: ${movieGenre} Film Project
Genre: ${movieGenre}
Script Length: ${scriptLength}

Project Overview:
${movieIdea}

Included in this package:
- Full screenplay
- Character development profiles
- Visual storyboard frames
- Detailed budget analysis
- Production schedule
- Location scouting details
- Sound design assets

Generated on: ${new Date().toISOString()}

Ready for production planning and collaboration.
`.trim();

    return NextResponse.json({ exportPackage });
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
