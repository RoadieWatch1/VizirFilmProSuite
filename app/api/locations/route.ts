// C:\Users\vizir\VizirPro\app\api\locations\route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateLocations } from "@/lib/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Helps avoid serverless timeouts for longer prompts (Vercel respects this on supported plans)
export const maxDuration = 60;

type LocationItem = {
  name?: string;
  type?: string;
  description?: string;
  mood?: string;
  colorPalette?: string;
  propsOrFeatures?: unknown;
  scenes?: unknown;
  rating?: unknown;
  lowBudgetTips?: string;
  highBudgetOpportunities?: string;
};

function isPlaceholderLocationName(name: string) {
  const n = (name || "").toLowerCase();
  return (
    n.includes("primary location") ||
    n.includes("secondary location") ||
    n.includes("climax location") ||
    n === "location" ||
    n === "unknown location"
  );
}

function safeJsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    let body: any = null;

    try {
      body = await request.json();
    } catch {
      return safeJsonError("Invalid JSON body.", 400);
    }

    const script = typeof body?.script === "string" ? body.script : "";
    const genre = typeof body?.genre === "string" ? body.genre : "";

    // ✅ Genre is required; script can be empty (generators.ts has a safe fallback script)
    if (!genre.trim()) {
      return safeJsonError("Genre is required.", 400);
    }

    // Generate locations via OpenAI
    const result = await generateLocations(script, genre);

    const locationsRaw = (result as any)?.locations;

    // ✅ Log a compact preview for debugging (avoid dumping huge arrays in prod logs)
    try {
      const preview = Array.isArray(locationsRaw)
        ? locationsRaw.slice(0, 6).map((l: any) => ({
            name: l?.name,
            type: l?.type,
            rating: l?.rating,
          }))
        : locationsRaw;

      console.log("🟠 LOCATIONS PREVIEW:", JSON.stringify(preview, null, 2));
      console.log("🟠 LOCATIONS COUNT:", Array.isArray(locationsRaw) ? locationsRaw.length : 0);
    } catch {
      // no-op
    }

    if (!Array.isArray(locationsRaw) || locationsRaw.length === 0) {
      console.error("⚠️ GPT returned empty or invalid locations array.", locationsRaw);
      return safeJsonError("GPT returned no locations.", 500);
    }

    const locations = locationsRaw as LocationItem[];

    // Check for purely generic placeholder locations
    const allGeneric = locations.every((loc) => isPlaceholderLocationName(String(loc?.name || "")));
    if (allGeneric) {
      console.error("⚠️ GPT returned only generic placeholder locations.");
      return safeJsonError(
        "GPT returned only placeholder locations. Check your prompt in generators.ts.",
        500
      );
    }

    // ✅ Guarantee all fields exist for frontend safety
    const safeLocations = locations.map((loc) => {
      const ratingNum =
        typeof loc.rating === "number"
          ? loc.rating
          : typeof loc.rating === "string"
          ? Number(loc.rating)
          : NaN;

      return {
        name: typeof loc.name === "string" ? loc.name : "",
        type: typeof loc.type === "string" ? loc.type : "",
        description: typeof loc.description === "string" ? loc.description : "",
        mood: typeof loc.mood === "string" ? loc.mood : "",
        colorPalette: typeof loc.colorPalette === "string" ? loc.colorPalette : "",
        propsOrFeatures: Array.isArray(loc.propsOrFeatures) ? loc.propsOrFeatures : [],
        scenes: Array.isArray(loc.scenes) ? loc.scenes : [],
        rating: Number.isFinite(ratingNum) ? ratingNum : 0,
        lowBudgetTips: typeof loc.lowBudgetTips === "string" ? loc.lowBudgetTips : "",
        highBudgetOpportunities:
          typeof loc.highBudgetOpportunities === "string" ? loc.highBudgetOpportunities : "",
      };
    });

    // Optional: drop any empty-name rows to keep UI clean
    const filtered = safeLocations.filter((l) => (l.name || "").trim().length > 0);

    if (filtered.length === 0) {
      console.error("⚠️ Locations normalized but ended up empty after filtering.");
      return safeJsonError("GPT returned invalid locations after normalization.", 500);
    }

    return NextResponse.json(
      { locations: filtered },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("[API] Locations generation error:", error);
    return NextResponse.json(
      {
        error:
          error?.message || "Failed to generate locations. Please try again later.",
      },
      { status: 500 }
    );
  }
}
