// C:\Users\vizir\VizirPro\lib\scriptParser.ts
// Pure, server-safe screenplay parser + emitters for Final Draft (.fdx) and Fountain (.fountain).
//
// The parser takes raw script text (typically produced by an LLM in a conventional
// screenplay layout) and produces a format-neutral intermediate representation.
// From that IR we emit:
//   - FDX   — Final Draft XML (the industry-standard professional format)
//   - Fountain — the open plain-text screenplay format
//
// We reuse the line-level classifiers from lib/tableRead.ts so that both features
// stay consistent: what the Table Read reads as "dialogue" is what ends up in the
// FDX <Paragraph Type="Dialogue"> element.

import { parseScript as parseLines, normalizeCharacterName } from "@/lib/tableRead";

// ─────────────────────────────────────────────────────────────
// Intermediate Representation
// ─────────────────────────────────────────────────────────────
export type ScreenplayElement =
  | { type: "scene_heading"; text: string; sceneNumber?: number }
  | { type: "action"; text: string }
  | { type: "character"; text: string; extension?: string; normalized: string }
  | { type: "parenthetical"; text: string }
  | { type: "dialogue"; text: string }
  | { type: "transition"; text: string };

export interface TitlePage {
  title?: string;
  credit?: string;
  author?: string;
  draftDate?: string;
  contact?: string;
}

export interface ParsedScreenplay {
  titlePage: TitlePage;
  elements: ScreenplayElement[];
}

// Screenplay character extensions like (V.O.), (O.S.), (CONT'D).
const EXT_RE =
  /\s*\((V\.?O\.?|O\.?S\.?|CONT(?:INUED|'D|’D)?|FILTERED|FILTER|PRE-?LAP|SUBTITLE|TEXT|ON PHONE|INTO PHONE|WHISPER|WHISPERED)\)\s*$/i;

function splitCharacterExtension(raw: string): { name: string; extension?: string } {
  const m = raw.match(EXT_RE);
  if (!m) return { name: raw.trim() };
  return {
    name: raw.replace(EXT_RE, "").trim(),
    extension: m[1].toUpperCase().replace(/[’'']/g, "'"),
  };
}

// ─────────────────────────────────────────────────────────────
// Parse: raw script → IR
// ─────────────────────────────────────────────────────────────
export function parseScreenplay(rawScript: string, titlePage: TitlePage = {}): ParsedScreenplay {
  // Strip markdown artifacts that LLMs sometimes produce
  const cleaned = rawScript
    .replace(/\r\n/g, "\n")
    .replace(/^\s*#+\s*/gm, "")                 // leading markdown headings
    .replace(/\*\*(.*?)\*\*/g, "$1")           // bold
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1") // italic (single asterisk)
    .replace(/^\s*Page \d+\s*$/gim, "")        // page markers
    .replace(/^\s*\d+\.\s*$/gm, "")            // bare scene-number markers
    .trim();

  const lines = parseLines(cleaned);

  const elements: ScreenplayElement[] = [];
  for (const l of lines) {
    switch (l.kind) {
      case "heading":
        elements.push({
          type: "scene_heading",
          text: l.text.toUpperCase(),
          sceneNumber: l.sceneNumber,
        });
        break;
      case "transition":
        elements.push({ type: "transition", text: l.text.toUpperCase() });
        break;
      case "character": {
        const { name, extension } = splitCharacterExtension(l.text);
        elements.push({
          type: "character",
          text: extension ? `${name.toUpperCase()} (${extension})` : name.toUpperCase(),
          extension,
          normalized: normalizeCharacterName(l.text),
        });
        break;
      }
      case "parenthetical":
        elements.push({ type: "parenthetical", text: l.text });
        break;
      case "dialogue":
        elements.push({ type: "dialogue", text: l.text });
        break;
      case "action":
      default:
        elements.push({ type: "action", text: l.text });
        break;
    }
  }

  return { titlePage, elements };
}

// ─────────────────────────────────────────────────────────────
// XML escaping (minimal, standards-correct for text content)
// ─────────────────────────────────────────────────────────────
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─────────────────────────────────────────────────────────────
// FDX Emitter
// Final Draft .fdx is XML with <FinalDraft><Content><Paragraph Type="..."><Text>...</Text></Paragraph>...
// Paragraph types: "Scene Heading", "Action", "Character", "Parenthetical", "Dialogue", "Transition", "General", "Shot".
// The schema is documented publicly; Final Draft 10/11/12 all accept this structure.
// ─────────────────────────────────────────────────────────────
const FDX_TYPE_MAP: Record<ScreenplayElement["type"], string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
};

export function emitFdx(parsed: ParsedScreenplay): string {
  const paragraphs = parsed.elements
    .map((el) => {
      const type = FDX_TYPE_MAP[el.type];
      return `    <Paragraph Type="${type}">\n      <Text>${escapeXml(el.text)}</Text>\n    </Paragraph>`;
    })
    .join("\n");

  const titleMeta = renderFdxTitlePage(parsed.titlePage);

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
${paragraphs}
  </Content>
${titleMeta}</FinalDraft>
`;
}

function renderFdxTitlePage(tp: TitlePage): string {
  // TitlePage is an optional sibling of <Content>. We only include it if we have fields.
  const fields: Array<[string, string | undefined]> = [
    ["Title", tp.title],
    ["Credit", tp.credit],
    ["Author", tp.author],
    ["Source", undefined],
    ["DraftDate", tp.draftDate],
    ["Contact", tp.contact],
  ];
  const present = fields.filter(([, v]) => v && v.trim().length > 0);
  if (present.length === 0) return "";
  const entries = present
    .map(([key, v]) => `      <Paragraph><Text>${escapeXml(String(v))}</Text></Paragraph>`)
    .join("\n");
  // TitlePage spec: a list of paragraphs. We emit a simple variant most readers accept.
  return `  <TitlePage>
    <Content>
${entries}
    </Content>
  </TitlePage>
`;
}

// ─────────────────────────────────────────────────────────────
// Fountain Emitter
// Fountain rules we honor:
//   - Blank line between elements
//   - Scene headings recognized by INT./EXT./EST./I/E. prefix (no force-marker needed)
//   - Character: blank line + all-caps line (we uppercase to be safe)
//   - Parenthetical: (...) on its own line within the dialogue block
//   - Dialogue: text following a character cue, continuing until a blank line
//   - Transition: blank line + all-caps line ending in "TO:" (we add `>` when needed)
// https://fountain.io/syntax
// ─────────────────────────────────────────────────────────────
export function emitFountain(parsed: ParsedScreenplay): string {
  const out: string[] = [];

  // Title page block
  const tp = parsed.titlePage;
  const tpLines: string[] = [];
  if (tp.title) tpLines.push(`Title: ${tp.title}`);
  if (tp.credit) tpLines.push(`Credit: ${tp.credit}`);
  if (tp.author) tpLines.push(`Author: ${tp.author}`);
  if (tp.draftDate) tpLines.push(`Draft date: ${tp.draftDate}`);
  if (tp.contact) tpLines.push(`Contact: ${tp.contact}`);
  if (tpLines.length) {
    out.push(tpLines.join("\n"));
    out.push(""); // blank line terminates title page
  }

  let prev: ScreenplayElement["type"] | null = null;

  for (const el of parsed.elements) {
    // Insert blank line between blocks when leaving a dialogue block.
    const needsBlankBefore =
      prev !== null &&
      !(
        (prev === "character" && (el.type === "parenthetical" || el.type === "dialogue")) ||
        (prev === "parenthetical" && (el.type === "dialogue" || el.type === "parenthetical")) ||
        (prev === "dialogue" && (el.type === "parenthetical" || el.type === "dialogue"))
      );

    if (needsBlankBefore && out.length && out[out.length - 1] !== "") {
      out.push("");
    }

    switch (el.type) {
      case "scene_heading":
        out.push(el.text.toUpperCase());
        break;
      case "action":
        // Force action if action happens to start with INT./EXT. (rare but possible).
        if (/^(INT\.|EXT\.|EST\.|I\/E\.|INT\/EXT\.|EXT\/INT\.)/i.test(el.text)) {
          out.push(`!${el.text}`);
        } else {
          out.push(el.text);
        }
        break;
      case "character":
        // If the name isn't all-caps Fountain's parser treats it as action.
        // Our IR already uppercases; add `@` as a safety prefix when anything non-ASCII-letter appears.
        if (/^[A-Z0-9 ()'.,-]+$/.test(el.text)) {
          out.push(el.text);
        } else {
          out.push(`@${el.text}`);
        }
        break;
      case "parenthetical":
        out.push(el.text);
        break;
      case "dialogue":
        out.push(el.text);
        break;
      case "transition":
        // Fountain auto-detects transitions that end in "TO:"; otherwise force with ">".
        if (/TO:\s*$/i.test(el.text) || /^THE END\.?$/i.test(el.text) || /^FADE (IN|OUT|TO BLACK)/i.test(el.text)) {
          out.push(el.text.toUpperCase());
        } else {
          out.push(`> ${el.text.toUpperCase()}`);
        }
        break;
    }

    prev = el.type;
  }

  // Ensure trailing newline
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ─────────────────────────────────────────────────────────────
// Convenience exports
// ─────────────────────────────────────────────────────────────
export function scriptToFdx(rawScript: string, titlePage: TitlePage = {}): string {
  return emitFdx(parseScreenplay(rawScript, titlePage));
}

export function scriptToFountain(rawScript: string, titlePage: TitlePage = {}): string {
  return emitFountain(parseScreenplay(rawScript, titlePage));
}
