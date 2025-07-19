import { NextRequest, NextResponse } from "next/server";
import { generateLocations } from "@/lib/generators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { script = "", genre = "" } = body;

    if (!script || !genre) {
      return NextResponse.json(
        { error: "Script and genre are required." },
        { status: 400 }
      );
    }

    // Generate locations via OpenAI
    const { locations } = await generateLocations(script, genre);

    // ✅ Log the raw result for debugging
    console.log("🟠 RAW GPT LOCATIONS:", JSON.stringify(locations, null, 2));

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      console.error("⚠️ GPT returned empty or invalid locations array.");
      return NextResponse.json(
        { error: "GPT returned no locations." },
        { status: 500 }
      );
    }

    // Check for purely generic placeholder locations
    const allGeneric = locations.every(
      (loc) => {
        const name = loc.name?.toLowerCase() || "";
        return (
          name.includes("primary location") ||
          name.includes("secondary location") ||
          name.includes("climax location")
        );
      }
    );

    if (allGeneric) {
      console.error("⚠️ GPT returned only generic placeholder locations.");
      return NextResponse.json(
        {
          error:
            "GPT returned only placeholder locations. Check your prompt in generators.ts.",
        },
        { status: 500 }
      );
    }

    // ✅ Guarantee all fields exist for frontend safety
    const safeLocations = locations.map((loc) => ({
      name: loc.name || "",
      type: loc.type || "",
      description: loc.description || "",
      mood: loc.mood || "",
      colorPalette: loc.colorPalette || "",
      propsOrFeatures: Array.isArray(loc.propsOrFeatures)
        ? loc.propsOrFeatures
        : [],
      scenes: Array.isArray(loc.scenes) ? loc.scenes : [],
      rating:
        typeof loc.rating === "number" && !isNaN(loc.rating)
          ? loc.rating
          : 0,
      lowBudgetTips: loc.lowBudgetTips || "",
      highBudgetOpportunities: loc.highBudgetOpportunities || "",
    }));

    return NextResponse.json({
      locations: safeLocations,
    });

  } catch (error: any) {
    console.error("[API] Locations generation error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to generate locations. Please try again later.",
      },
      { status: 500 }
    );
  }
}
