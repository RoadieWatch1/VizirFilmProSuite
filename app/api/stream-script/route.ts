// C:\Users\vizir\VizirPro\app\api\stream-script\route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 800;

const SCREENPLAY_SYSTEM_PROMPT = `
You are a WGA-caliber professional screenwriter with produced feature and episodic credits. You write with the economy of Aaron Sorkin, the visual clarity of Christopher Nolan, the character truth of Greta Gerwig, and the structural discipline of Tony Gilroy. Output ONLY screenplay text in **Fountain** format.

# CRAFT PRINCIPLES (NON-NEGOTIABLE)

## Structure
- Hit a recognizable three-act shape. Inciting incident in act one, midpoint reversal, all-is-lost before act three, decisive climax.
- Every scene must do at least TWO of: advance plot, reveal character, raise stakes, escalate conflict, plant/pay off a setup.
- Start scenes late; end them early.

## Show Don't Tell
- Reveal character through ACTION and SUBTEXT.
- BANNED unless subverted: "I'm fine", "We need to talk", mirror monologues, characters announcing feelings, exposition dumps.

## Dialogue
- Distinct voices per character. If two characters could swap a line, rewrite.
- Subtext over statement. People deflect, interrupt, lie.
- No "as you know" exposition. Trim adverbs.

## Action
- Present tense, active verbs. "She slams the door" not "She angrily closes the door."
- No novelistic interiority. Externalize.
- White space is rhythm. Short beats for pace; 3-4 lines max for atmosphere.

## Scene Headings
- INT./EXT. LOCATION - DAY/NIGHT (or DAWN/DUSK/CONTINUOUS/LATER).
- Never exceed ~350 words between slug lines.

## Genre Voice
- HORROR: restraint, delay, sound implied, POV close.
- THRILLER: visible ticking clock, information asymmetry, reversals every 8-12 pages.
- COMEDY: rule-of-three, escalating bits, character comedy over joke comedy.
- DRAMA: interior stakes externalized; symbolic recurring objects.
- ACTION: geography first, cause/effect clarity, character in choreography.
- SCI-FI/FANTASY: ground the unreal in sensory specifics; rules enforced.
- ROMANCE: internal obstacles before external; longing in the unsaid.
- CRIME/NOIR: moral compromise; clipped, loaded dialogue.

# FOUNTAIN FORMAT — STRICT
- Scene headings flush left, uppercase.
- Action flush left, present tense.
- CHARACTER cues uppercase on their own line.
- Parentheticals sparing: "(beat)", "(softly)" — only when ambiguous.
- Dialogue beneath character cue.
- Transitions (SMASH CUT TO:, CUT TO:) only when they matter.
- NO markdown, NO JSON, NO commentary, NO meta labels ("PART 1", "ACT I").

# FORBIDDEN
- Generic names (JOHN, JANE) unless archetypal.
- Clichés: "little did they know", "suddenly".
- Directions requiring telepathy ("He realizes she lied").
- Block paragraphs > 4 lines.
- Summarizing emotion ("angry", "sad") — dramatize.

Write like the draft ships to a producer in the morning.
`.trim();

function parseDurationToMinutes(raw: string | undefined): number {
  if (!raw) return 5;
  const s = String(raw).trim().toLowerCase();
  const hr = s.match(/(\d+)\s*(h|hr|hour|hours)\b/);
  if (hr) {
    const h = parseInt(hr[1], 10);
    if (!isNaN(h)) return Math.max(1, Math.min(300, h * 60));
  }
  const num = s.match(/(\d{1,3})/);
  if (num) {
    const m = parseInt(num[1], 10);
    if (!isNaN(m)) return Math.max(1, Math.min(300, m));
  }
  if (s.includes("feature")) return 120;
  if (s.includes("short")) return 10;
  return 5;
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const movieIdea = String(body?.movieIdea || "").trim();
  const movieGenre = String(body?.movieGenre || "").trim();
  const scriptLength = String(body?.scriptLength || "5 min").trim();
  const logline = String(body?.logline || "").trim();
  const synopsis = String(body?.synopsis || "").trim();

  if (!movieIdea || !movieGenre) {
    return new Response(JSON.stringify({ error: "movieIdea and movieGenre are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const minutes = parseDurationToMinutes(scriptLength);
  const wordsPerPage = 180;
  const targetWords = Math.max(400, minutes * wordsPerPage);

  const model = (process.env.OPENAI_MODEL_TEXT || "gpt-4.1").trim();
  const openai = new OpenAI({
    apiKey,
    maxRetries: 0,
    timeout: 780000,
  });

  const userPrompt = `
Write a complete ${scriptLength} (~${minutes} minutes, ~${minutes} pages, target ~${targetWords} words) ${movieGenre} screenplay in proper Fountain format.

LOGLINE: ${logline || "(derive from idea)"}
${synopsis ? `\nSYNOPSIS:\n${synopsis}\n` : ""}
IDEA:
${movieIdea}

Requirements:
- Open with FADE IN:
- Three-act structure with clear inciting incident, midpoint reversal, all-is-lost, and climax.
- Use scene headings (INT./EXT.) frequently — never go 350+ words without a new slug line.
- Distinct character voices. Subtext over statement.
- Present tense, active verbs, concrete imagery.
- End with FADE OUT.

Begin the screenplay now. Output ONLY the screenplay.
`.trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          stream: true,
          messages: [
            { role: "system", content: SCREENPLAY_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: Math.min(16000, Math.max(2000, Math.round(targetWords * 1.6))),
        });

        for await (const chunk of completion) {
          const delta = chunk?.choices?.[0]?.delta?.content || "";
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        controller.close();
      } catch (err: any) {
        const msg = String(err?.message || err || "Streaming error");
        try {
          controller.enqueue(encoder.encode(`\n\n[ERROR] ${msg}`));
        } catch {}
        controller.close();
      }
    },
    cancel() {
      // Client aborted — nothing to clean up on the OpenAI stream,
      // the async iteration will fail and exit gracefully.
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
