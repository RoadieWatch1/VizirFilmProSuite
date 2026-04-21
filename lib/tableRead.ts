// C:\Users\vizir\VizirPro\lib\tableRead.ts
// Pure helpers for Table Read: screenplay parsing + ElevenLabs voice assignment.
// Server-safe (no browser APIs) and client-safe (no OpenAI SDK).

import type { Character } from "@/lib/generators";

export type ScriptLineKind =
  | "heading"        // INT. LOCATION - DAY
  | "action"         // descriptive prose
  | "character"      // character name cue
  | "dialogue"       // spoken line
  | "parenthetical"  // (beat)
  | "transition";    // CUT TO:

export interface ScriptLine {
  index: number;            // position in the final line array
  kind: ScriptLineKind;
  text: string;             // the displayable text (raw, trimmed)
  character?: string;       // normalized character name (uppercase, no extensions)
  sceneNumber?: number;     // 1-based scene index
  speakable: boolean;       // true only for dialogue lines that should be sent to TTS
  voiceId?: string;         // set by voice assignment
  voiceName?: string;       // human-readable label
}

export interface VoiceAssignment {
  voiceId: string;
  voiceName: string;
  gender: "male" | "female" | "neutral";
}

export interface TableReadPackage {
  lines: ScriptLine[];
  voiceMap: Record<string, VoiceAssignment>; // keyed by normalized character name
  stats: {
    totalLines: number;
    dialogueLines: number;
    speakableLines: number;
    characterCount: number;
    truncated: boolean;
    approxPages: number;
  };
}

// ─────────────────────────────────────────────────────────────
// ElevenLabs voice roster (public default voices).
// https://elevenlabs.io/app/voice-library — these are stable IDs.
// ─────────────────────────────────────────────────────────────
const VOICE_ROSTER: VoiceAssignment[] = [
  { voiceId: "21m00Tcm4TlvDq8ikWAM", voiceName: "Rachel",    gender: "female" },
  { voiceId: "EXAVITQu4vr4xnSDxMaL", voiceName: "Bella",     gender: "female" },
  { voiceId: "MF3mGyEYCl7XYWbV9V6O", voiceName: "Elli",      gender: "female" },
  { voiceId: "XB0fDUnXU5powFXDhCwa", voiceName: "Charlotte", gender: "female" },
  { voiceId: "jsCqWAovK2LkecY7zXl4", voiceName: "Freya",     gender: "female" },
  { voiceId: "AZnzlk1XvdvUeBnXmlld", voiceName: "Domi",      gender: "female" },
  { voiceId: "ErXwobaYiN019PkySvjV", voiceName: "Antoni",    gender: "male" },
  { voiceId: "TxGEqnHWrfWFTfGW9XjX", voiceName: "Josh",      gender: "male" },
  { voiceId: "VR6AewLTigWG4xSOukaG", voiceName: "Arnold",    gender: "male" },
  { voiceId: "pNInz6obpgDQGcFmaJgB", voiceName: "Adam",      gender: "male" },
  { voiceId: "yoZ06aMxZJJ28mfd3POQ", voiceName: "Sam",       gender: "male" },
  { voiceId: "2EiwWnXFnvU5JabPnv8n", voiceName: "Clyde",     gender: "male" },
  { voiceId: "zcAOhNBS3c14rBihAFp1", voiceName: "Giovanni",  gender: "male" },
];

const ALLOWED_VOICE_IDS = new Set(VOICE_ROSTER.map((v) => v.voiceId));

export function getVoiceRoster(): VoiceAssignment[] {
  return VOICE_ROSTER.slice();
}

export function isAllowedVoiceId(id: string): boolean {
  return ALLOWED_VOICE_IDS.has(id);
}

// ─────────────────────────────────────────────────────────────
// Character name normalization.
// Strips common screenplay extensions: (V.O.), (O.S.), (CONT'D), (FILTER), (PRE-LAP).
// ─────────────────────────────────────────────────────────────
const CHARACTER_EXTENSION_RE =
  /\s*\((?:V\.?O\.?|O\.?S\.?|CONT(?:INUED|'D|’D)?|FILTERED|FILTER|PRE-?LAP|SUBTITLE|TEXT|ON PHONE|INTO PHONE|WHISPER|WHISPERED)\)\s*$/i;

export function normalizeCharacterName(raw: string): string {
  return raw.replace(CHARACTER_EXTENSION_RE, "").replace(/\s+/g, " ").trim().toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// Screenplay line classifiers.
// ─────────────────────────────────────────────────────────────
const HEADING_RE = /^(INT\.|EXT\.|EST\.|I\/E\.|INT\/EXT\.|EXT\/INT\.)/i;
const TRANSITION_RE =
  /^(CUT TO:|FADE (?:IN|OUT|TO BLACK)[:.]?|SMASH CUT TO:|MATCH CUT TO:|DISSOLVE TO:|JUMP CUT TO:|THE END\.?|FADE IN:|FADE OUT:?)\s*$/i;
const PARENTHETICAL_RE = /^\(.+\)\s*$/;

function isAllCaps(line: string): boolean {
  // Must have at least one letter, and every letter must be uppercase.
  if (!/[A-Z]/.test(line)) return false;
  if (/[a-z]/.test(line)) return false;
  return true;
}

function isLikelyCharacterCue(line: string): boolean {
  const stripped = line.replace(CHARACTER_EXTENSION_RE, "").trim();
  if (!stripped) return false;
  if (!isAllCaps(stripped)) return false;
  // Character cues rarely end in punctuation other than ? ! .
  if (/[:;,]$/.test(stripped)) return false;
  // Character cues are short (≤ 5 words usually).
  const wordCount = stripped.split(/\s+/).length;
  if (wordCount > 5) return false;
  // Exclude things that look like headings/transitions.
  if (HEADING_RE.test(stripped)) return false;
  if (TRANSITION_RE.test(stripped)) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────
// Parser: walks the script line-by-line with a tiny state machine.
// Dialogue = lines that follow a character cue, stopping at a blank line
// or a new heading / character cue.
// ─────────────────────────────────────────────────────────────
export function parseScript(script: string): ScriptLine[] {
  const rawLines = script.replace(/\r\n/g, "\n").split("\n");
  const out: ScriptLine[] = [];
  let sceneNumber = 0;
  let awaitingDialogueFor: string | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i] ?? "";
    const trimmed = raw.trim();

    if (!trimmed) {
      awaitingDialogueFor = null;
      continue;
    }

    // Scene heading
    if (HEADING_RE.test(trimmed)) {
      sceneNumber += 1;
      out.push({
        index: out.length,
        kind: "heading",
        text: trimmed,
        sceneNumber,
        speakable: false,
      });
      awaitingDialogueFor = null;
      continue;
    }

    // Transition
    if (TRANSITION_RE.test(trimmed)) {
      out.push({
        index: out.length,
        kind: "transition",
        text: trimmed,
        sceneNumber: sceneNumber || undefined,
        speakable: false,
      });
      awaitingDialogueFor = null;
      continue;
    }

    // Parenthetical inside dialogue
    if (awaitingDialogueFor && PARENTHETICAL_RE.test(trimmed)) {
      out.push({
        index: out.length,
        kind: "parenthetical",
        text: trimmed,
        character: awaitingDialogueFor,
        sceneNumber: sceneNumber || undefined,
        speakable: false,
      });
      continue;
    }

    // Character cue (only promote to cue if the NEXT non-blank line exists — otherwise treat as action).
    if (isLikelyCharacterCue(trimmed)) {
      const hasFollowingLine = rawLines.slice(i + 1).some((l) => l.trim().length > 0);
      if (hasFollowingLine) {
        const name = normalizeCharacterName(trimmed);
        out.push({
          index: out.length,
          kind: "character",
          text: trimmed,
          character: name,
          sceneNumber: sceneNumber || undefined,
          speakable: false,
        });
        awaitingDialogueFor = name;
        continue;
      }
    }

    // Dialogue
    if (awaitingDialogueFor) {
      out.push({
        index: out.length,
        kind: "dialogue",
        text: trimmed,
        character: awaitingDialogueFor,
        sceneNumber: sceneNumber || undefined,
        speakable: true,
      });
      continue;
    }

    // Default: action
    out.push({
      index: out.length,
      kind: "action",
      text: trimmed,
      sceneNumber: sceneNumber || undefined,
      speakable: false,
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────
// Gender inference from a character's description/traits.
// Very conservative — defaults to "neutral" if ambiguous.
// ─────────────────────────────────────────────────────────────
const FEMALE_CUES = [
  /\bshe\b/i, /\bher\b/i, /\bhers\b/i, /\bherself\b/i,
  /\bwoman\b/i, /\bwomen\b/i, /\bgirl\b/i, /\blady\b/i,
  /\bmother\b/i, /\bmom\b/i, /\bmum\b/i, /\bdaughter\b/i,
  /\bwife\b/i, /\bsister\b/i, /\baunt\b/i, /\bgrandmother\b/i,
  /\bactress\b/i, /\bfemale\b/i, /\bqueen\b/i, /\bprincess\b/i,
];

const MALE_CUES = [
  /\bhe\b/i, /\bhim\b/i, /\bhis\b/i, /\bhimself\b/i,
  /\bman\b/i, /\bmen\b/i, /\bboy\b/i, /\bguy\b/i, /\bdude\b/i,
  /\bfather\b/i, /\bdad\b/i, /\bson\b/i, /\bhusband\b/i,
  /\bbrother\b/i, /\buncle\b/i, /\bgrandfather\b/i,
  /\bmale\b/i, /\bking\b/i, /\bprince\b/i,
];

function inferGender(c: Character | undefined): "male" | "female" | "neutral" {
  if (!c) return "neutral";
  const haystack = [
    c.description || "",
    c.role || "",
    c.mood || "",
    ...(c.traits || []),
  ]
    .join(" ")
    .toLowerCase();
  let female = 0;
  let male = 0;
  for (const re of FEMALE_CUES) if (re.test(haystack)) female += 1;
  for (const re of MALE_CUES) if (re.test(haystack)) male += 1;
  if (female > male && female > 0) return "female";
  if (male > female && male > 0) return "male";
  return "neutral";
}

// ─────────────────────────────────────────────────────────────
// Voice assignment — unique voice per character when possible.
// Order of preference: matched gender → opposite gender → any remaining.
// ─────────────────────────────────────────────────────────────
export function assignVoices(
  speakingCharacters: string[],
  characters: Character[] = [],
  manualOverrides: Record<string, string> = {},
): Record<string, VoiceAssignment> {
  const charByName = new Map<string, Character>();
  for (const c of characters) {
    if (c?.name) charByName.set(c.name.toUpperCase(), c);
  }

  const used = new Set<string>();
  const assignments: Record<string, VoiceAssignment> = {};

  // Pass 1: honor manual overrides first.
  for (const name of speakingCharacters) {
    const override = manualOverrides[name];
    if (override && ALLOWED_VOICE_IDS.has(override)) {
      const v = VOICE_ROSTER.find((x) => x.voiceId === override);
      if (v) {
        assignments[name] = v;
        used.add(v.voiceId);
      }
    }
  }

  // Pass 2: auto-assign remaining by inferred gender, unique when possible.
  for (const name of speakingCharacters) {
    if (assignments[name]) continue;
    const inferred = inferGender(charByName.get(name));
    const preferred = VOICE_ROSTER.filter((v) => v.gender === inferred && !used.has(v.voiceId));
    const alternate = VOICE_ROSTER.filter((v) => v.gender !== inferred && !used.has(v.voiceId));
    const anyRemaining = VOICE_ROSTER.filter((v) => !used.has(v.voiceId));

    const pick =
      preferred[0] ||
      alternate[0] ||
      anyRemaining[0] ||
      // Last resort: reuse the first voice in the roster.
      VOICE_ROSTER[0];

    assignments[name] = pick;
    used.add(pick.voiceId);
  }

  return assignments;
}

// ─────────────────────────────────────────────────────────────
// Preview cap — caps a parsed script at approximately N pages.
// Uses SCRIPT_WORDS_PER_PAGE semantics (180 default).
// ─────────────────────────────────────────────────────────────
const WORDS_PER_PAGE = 180;

export function applyPreviewCap(lines: ScriptLine[], pageCap: number): { lines: ScriptLine[]; truncated: boolean; approxPages: number } {
  const targetWords = Math.max(1, pageCap * WORDS_PER_PAGE);
  let wordCount = 0;
  const out: ScriptLine[] = [];
  for (const line of lines) {
    const w = line.text.split(/\s+/).filter(Boolean).length;
    wordCount += w;
    out.push(line);
    if (wordCount >= targetWords) {
      return {
        lines: out,
        truncated: out.length < lines.length,
        approxPages: Math.ceil(wordCount / WORDS_PER_PAGE),
      };
    }
  }
  return {
    lines: out,
    truncated: false,
    approxPages: Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE)),
  };
}

// ─────────────────────────────────────────────────────────────
// Top-level orchestrator used by the API route.
// ─────────────────────────────────────────────────────────────
export function buildTableReadPackage(
  script: string,
  characters: Character[] | undefined,
  opts: { previewPages?: number; manualOverrides?: Record<string, string> } = {},
): TableReadPackage {
  const parsedAll = parseScript(script);
  const { lines: parsed, truncated, approxPages } = opts.previewPages
    ? applyPreviewCap(parsedAll, opts.previewPages)
    : { lines: parsedAll, truncated: false, approxPages: Math.max(1, Math.ceil(parsedAll.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0) / WORDS_PER_PAGE)) };

  const speakingSet = new Set<string>();
  for (const l of parsed) {
    if (l.kind === "dialogue" && l.character) speakingSet.add(l.character);
  }
  const speakingCharacters = Array.from(speakingSet);
  const voiceMap = assignVoices(speakingCharacters, characters || [], opts.manualOverrides || {});

  // Enrich dialogue lines with their assigned voice.
  const enriched = parsed.map((l) => {
    if (l.kind === "dialogue" && l.character) {
      const v = voiceMap[l.character];
      if (v) return { ...l, voiceId: v.voiceId, voiceName: v.voiceName };
    }
    return l;
  });

  const dialogueLines = enriched.filter((l) => l.kind === "dialogue").length;
  const speakableLines = enriched.filter((l) => l.speakable && l.voiceId).length;

  return {
    lines: enriched,
    voiceMap,
    stats: {
      totalLines: enriched.length,
      dialogueLines,
      speakableLines,
      characterCount: speakingCharacters.length,
      truncated,
      approxPages,
    },
  };
}
