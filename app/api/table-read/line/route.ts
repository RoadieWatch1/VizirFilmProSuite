// C:\Users\vizir\VizirPro\app\api\table-read\line\route.ts
// Per-line Text-to-Speech using ElevenLabs REST API.
// Browser calls this once per dialogue line, plays the returned MP3, then requests the next line.
import { NextRequest, NextResponse } from "next/server";
import { isAllowedVoiceId } from "@/lib/tableRead";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_LINE_CHARS = 800;              // safety cap per request
const DEFAULT_MODEL = "eleven_turbo_v2_5"; // fast, cheap, good-quality
const ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ELEVENLABS_API_KEY is not configured. Add it in Vercel → Project Settings → Environment Variables.",
      },
      { status: 500 },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = String(body?.text || "").trim();
  const voiceId = String(body?.voiceId || "").trim();
  const modelId = String(body?.modelId || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

  if (!text) {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }
  if (!voiceId) {
    return NextResponse.json({ error: "Missing voiceId." }, { status: 400 });
  }
  if (!isAllowedVoiceId(voiceId)) {
    return NextResponse.json(
      { error: "Voice is not on the allowed roster." },
      { status: 400 },
    );
  }

  const safeText = text.slice(0, MAX_LINE_CHARS);

  try {
    const upstream = await fetch(`${ENDPOINT}/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: safeText,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "");
      console.error("ElevenLabs error:", upstream.status, errorText);
      // Surface quota errors clearly so UI can show a helpful message.
      if (upstream.status === 401) {
        return NextResponse.json(
          { error: "ElevenLabs authentication failed. Check ELEVENLABS_API_KEY." },
          { status: 502 },
        );
      }
      if (upstream.status === 429) {
        return NextResponse.json(
          { error: "ElevenLabs quota exceeded. Upgrade your plan or try again later." },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `ElevenLabs TTS failed (${upstream.status}).` },
        { status: 502 },
      );
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("Table read line TTS failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate line audio." },
      { status: 500 },
    );
  }
}
