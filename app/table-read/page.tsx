"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Loader2,
  StopCircle,
  Sparkles,
  Volume2,
  AlertCircle,
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EmptyState from "@/components/EmptyState";
import { useFilmStore } from "@/lib/store";
import type { ScriptLine, VoiceAssignment, TableReadPackage } from "@/lib/tableRead";

// Voice roster (mirror of lib/tableRead.ts VOICE_ROSTER, kept client-side so we can render dropdowns without a fetch).
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

const NON_SPEAKABLE_DWELL_MS: Record<ScriptLine["kind"], number> = {
  heading: 900,
  action: 700,
  character: 250,
  dialogue: 0,
  parenthetical: 450,
  transition: 700,
};

type PreparedPackage = TableReadPackage;

export default function TableReadPage() {
  const { filmPackage } = useFilmStore();

  const [preparing, setPreparing] = useState(false);
  const [pkg, setPkg] = useState<PreparedPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(true);
  const [voiceOverrides, setVoiceOverrides] = useState<Record<string, string>>({});

  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dwellTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const scriptContainerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const hasScript = !!filmPackage?.script && filmPackage.script.trim().length > 80;

  useEffect(() => {
    return () => {
      cleanupPlayback();
    };
  }, []);

  // Auto-scroll active line into view.
  useEffect(() => {
    const el = lineRefs.current.get(currentIdx);
    if (el && scriptContainerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIdx]);

  const cleanupPlayback = () => {
    if (dwellTimeoutRef.current) {
      clearTimeout(dwellTimeoutRef.current);
      dwellTimeoutRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const handlePrepare = async () => {
    if (!filmPackage?.script) {
      toast.error("Generate a script first from the Create tab.");
      return;
    }
    cleanupPlayback();
    setPlaying(false);
    setError(null);
    setPreparing(true);

    try {
      const res = await fetch("/api/table-read/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: filmPackage.script,
          characters: filmPackage.characters || [],
          preview: previewMode,
          previewPages: 10,
          voiceOverrides,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error || "Failed to prepare table read.";
        setError(msg);
        toast.error(msg);
        return;
      }
      const data = (await res.json()) as PreparedPackage;
      setPkg(data);
      setCurrentIdx(firstSpeakableIdx(data.lines) ?? 0);
      toast.success(
        `Prepared ${data.stats.speakableLines} lines across ${data.stats.characterCount} characters.`,
      );
    } catch (err: any) {
      console.error("Prepare failed:", err);
      setError("Failed to prepare table read. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  const firstSpeakableIdx = (lines: ScriptLine[]): number | null => {
    for (let i = 0; i < lines.length; i++) if (lines[i].speakable) return i;
    return null;
  };

  // ─────────────────────────────────────────────────────────────
  // Playback state machine: advancing currentIdx while `playing`
  // triggers this effect to either fetch+play audio for a dialogue
  // line or dwell briefly on a non-speakable line.
  // ─────────────────────────────────────────────────────────────
  const playLineAt = useCallback(
    async (idx: number) => {
      if (!pkg) return;
      const line = pkg.lines[idx];
      if (!line) {
        setPlaying(false);
        return;
      }
      if (!line.speakable || !line.voiceId) {
        // Non-speakable: dwell and advance.
        dwellTimeoutRef.current = setTimeout(() => {
          advance();
        }, NON_SPEAKABLE_DWELL_MS[line.kind] ?? 500);
        return;
      }

      setLineLoading(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch("/api/table-read/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: line.text, voiceId: line.voiceId }),
          signal: ac.signal,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData?.error || `Line audio failed (${res.status}).`;
          setError(msg);
          toast.error(msg);
          setPlaying(false);
          setLineLoading(false);
          return;
        }
        const blob = await res.blob();
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => advance();
        audio.onerror = () => {
          setError("Audio playback failed.");
          setPlaying(false);
        };
        setLineLoading(false);
        await audio.play().catch((err) => {
          console.error("Play error:", err);
          setPlaying(false);
          setLineLoading(false);
        });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Line fetch error:", err);
        setError("Line audio request failed.");
        setPlaying(false);
        setLineLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pkg],
  );

  const advance = useCallback(() => {
    setCurrentIdx((i) => {
      if (!pkg) return i;
      const next = i + 1;
      if (next >= pkg.lines.length) {
        setPlaying(false);
        toast.success("Table read complete.");
        return i;
      }
      return next;
    });
  }, [pkg]);

  useEffect(() => {
    if (!playing || !pkg) return;
    // Reset prior audio before starting a new line.
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (dwellTimeoutRef.current) {
      clearTimeout(dwellTimeoutRef.current);
      dwellTimeoutRef.current = null;
    }
    playLineAt(currentIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, currentIdx, pkg]);

  const handlePlay = () => {
    if (!pkg) return;
    setError(null);
    setPlaying(true);
  };

  const handlePause = () => {
    if (audioRef.current) audioRef.current.pause();
    if (dwellTimeoutRef.current) {
      clearTimeout(dwellTimeoutRef.current);
      dwellTimeoutRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPlaying(false);
    setLineLoading(false);
  };

  const handleStop = () => {
    handlePause();
    if (pkg) setCurrentIdx(firstSpeakableIdx(pkg.lines) ?? 0);
  };

  const handleNext = () => {
    if (!pkg) return;
    handlePause();
    setCurrentIdx((i) => Math.min(pkg.lines.length - 1, i + 1));
  };

  const handlePrev = () => {
    if (!pkg) return;
    handlePause();
    setCurrentIdx((i) => Math.max(0, i - 1));
  };

  const handleVoiceChange = (character: string, voiceId: string) => {
    setVoiceOverrides((prev) => ({ ...prev, [character]: voiceId }));
    if (pkg) {
      const voice = VOICE_ROSTER.find((v) => v.voiceId === voiceId);
      if (!voice) return;
      const nextLines = pkg.lines.map((l) =>
        l.character === character && l.kind === "dialogue"
          ? { ...l, voiceId: voice.voiceId, voiceName: voice.voiceName }
          : l,
      );
      const nextVoiceMap = { ...pkg.voiceMap, [character]: voice };
      setPkg({ ...pkg, lines: nextLines, voiceMap: nextVoiceMap });
    }
  };

  const speakingCharacters = useMemo(() => {
    if (!pkg) return [];
    return Object.keys(pkg.voiceMap);
  }, [pkg]);

  const currentLine = pkg?.lines[currentIdx];
  const speakablePosition = useMemo(() => {
    if (!pkg) return { current: 0, total: 0 };
    let current = 0;
    let total = 0;
    for (let i = 0; i < pkg.lines.length; i++) {
      if (pkg.lines[i].speakable) {
        total += 1;
        if (i <= currentIdx) current += 1;
      }
    }
    return { current, total };
  }, [pkg, currentIdx]);

  if (!hasScript) {
    return (
      <EmptyState
        icon={Mic}
        title="AI Table Read"
        subtitle="Hear your script performed — unique AI voices per character"
        emptyTitle="No script yet"
        emptyDescription="Generate or paste a screenplay first, then come back here to hear it read aloud with distinct voices for every speaking role."
        needsPrerequisite
        prerequisiteMessage="Generate a script first so dialogue can be parsed and assigned to AI voices."
        actionLabel="Prepare Table Read"
        onAction={() => {}}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SETUP view (no package prepared yet).
  // ─────────────────────────────────────────────────────────────
  if (!pkg) {
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#E8ECF0] mb-2 flex items-center gap-3">
              <Mic className="w-7 h-7 text-[#FF6A00]" />
              AI Table Read
            </h1>
            <p className="text-[#B2C8C9]">
              Hear your screenplay performed with distinct AI voices for every speaking character.
              Powered by ElevenLabs.
            </p>
          </div>

          <Card className="glass-effect border-[rgba(255,255,255,0.08)] p-6 space-y-5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#7AE2CF] mt-1 shrink-0" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[#E8ECF0]">How it works</div>
                <p className="text-sm text-[#B2C8C9] leading-relaxed">
                  We parse your script into dialogue lines, auto-assign a distinct voice to each
                  character based on their profile, and play the read-through in order. You can
                  override any voice before starting.
                </p>
              </div>
            </div>

            <Separator className="bg-[rgba(255,255,255,0.06)]" />

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.target.checked)}
                className="mt-1 accent-[#FF6A00]"
              />
              <div>
                <div className="text-sm font-semibold text-[#E8ECF0]">
                  Preview mode — first 10 pages only
                </div>
                <div className="text-xs text-[#6E8B8D]">
                  Keeps ElevenLabs usage predictable. Turn off to read the entire script (uses more credit).
                </div>
              </div>
            </label>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={handlePrepare}
              disabled={preparing}
              className="bg-[#FF6A00] hover:bg-[#E55A00] text-white w-full"
            >
              {preparing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing cast...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Prepare Table Read
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PLAYER view (package is ready).
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[#E8ECF0] mb-1 flex items-center gap-3">
              <Mic className="w-7 h-7 text-[#FF6A00]" />
              AI Table Read
            </h1>
            <div className="text-sm text-[#B2C8C9] flex flex-wrap gap-x-3 gap-y-1">
              <span>{pkg.stats.speakableLines} dialogue lines</span>
              <span>·</span>
              <span>{pkg.stats.characterCount} speaking characters</span>
              <span>·</span>
              <span>~{pkg.stats.approxPages} pages</span>
              {pkg.stats.truncated && (
                <Badge className="bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30">
                  Preview truncated
                </Badge>
              )}
            </div>
          </div>
          <Button
            onClick={() => {
              handleStop();
              setPkg(null);
            }}
            variant="outline"
            className="bg-transparent border-[rgba(255,255,255,0.12)] text-[#B2C8C9] hover:bg-[rgba(255,255,255,0.04)]"
          >
            Reset Cast
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-300 mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Script panel */}
          <Card className="glass-effect border-[rgba(255,255,255,0.08)] p-0 overflow-hidden">
            <div className="sticky top-14 z-10 bg-[#091416]/95 backdrop-blur px-5 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  variant="outline"
                  className="bg-transparent border-[rgba(255,255,255,0.12)] text-[#B2C8C9]"
                  aria-label="Previous line"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                {playing ? (
                  <Button
                    size="sm"
                    onClick={handlePause}
                    className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handlePlay}
                    className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {lineLoading ? "Loading..." : "Play"}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={!pkg || currentIdx >= pkg.lines.length - 1}
                  variant="outline"
                  className="bg-transparent border-[rgba(255,255,255,0.12)] text-[#B2C8C9]"
                  aria-label="Next line"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleStop}
                  variant="outline"
                  className="bg-transparent border-[rgba(255,255,255,0.12)] text-[#B2C8C9]"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
              <div className="text-xs text-[#6E8B8D]">
                Line {speakablePosition.current} / {speakablePosition.total}
              </div>
            </div>

            <div
              ref={scriptContainerRef}
              className="px-5 py-5 max-h-[70vh] overflow-y-auto"
              style={{ fontFamily: "'Courier Prime', 'Courier New', monospace" }}
            >
              {pkg.lines.map((line) => {
                const isActive = line.index === currentIdx;
                return (
                  <div
                    key={line.index}
                    ref={(el) => {
                      if (el) lineRefs.current.set(line.index, el);
                      else lineRefs.current.delete(line.index);
                    }}
                    className={`transition-colors rounded-md px-3 py-1 ${
                      isActive
                        ? "bg-[#FF6A00]/15 border-l-2 border-[#FF6A00]"
                        : "border-l-2 border-transparent"
                    }`}
                  >
                    <ScriptLineView line={line} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Cast panel */}
          <Card className="glass-effect border-[rgba(255,255,255,0.08)] p-5 h-fit sticky top-20">
            <div className="flex items-center gap-2 mb-3">
              <UsersIcon className="w-4 h-4 text-[#7AE2CF]" />
              <h2 className="text-sm font-semibold text-[#E8ECF0] uppercase tracking-wider">Cast</h2>
            </div>
            <p className="text-xs text-[#6E8B8D] mb-4">
              Override any voice. Changes apply from the next line forward.
            </p>
            <div className="space-y-3">
              {speakingCharacters.map((name) => {
                const current = pkg.voiceMap[name];
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#E8ECF0] truncate">{name}</span>
                      {currentLine?.character === name && (
                        <Badge className="bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30 text-[10px]">
                          Speaking
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-[#6E8B8D] shrink-0" />
                      <select
                        value={current?.voiceId || ""}
                        onChange={(e) => handleVoiceChange(name, e.target.value)}
                        className="flex-1 bg-[#0B1A1D] border border-[rgba(255,255,255,0.08)] rounded-md text-xs text-[#E8ECF0] px-2 py-1.5"
                      >
                        {VOICE_ROSTER.map((v) => (
                          <option key={v.voiceId} value={v.voiceId}>
                            {v.voiceName} ({v.gender})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ScriptLineView({ line }: { line: ScriptLine }) {
  if (line.kind === "heading") {
    return (
      <div className="text-[#7AE2CF] text-sm font-bold tracking-wide uppercase mt-4 mb-1">
        {line.text}
      </div>
    );
  }
  if (line.kind === "transition") {
    return (
      <div className="text-[#FF6A00] text-sm font-bold tracking-wide uppercase text-right mt-2 mb-2">
        {line.text}
      </div>
    );
  }
  if (line.kind === "character") {
    return (
      <div className="text-[#E8ECF0] text-sm font-bold uppercase mt-3 mb-0.5 flex items-center gap-2 pl-[30%]">
        <span>{line.text}</span>
        {line.voiceName && (
          <span className="text-[10px] normal-case font-normal text-[#6E8B8D]">
            — {line.voiceName}
          </span>
        )}
      </div>
    );
  }
  if (line.kind === "parenthetical") {
    return (
      <div className="text-[#A8BFC1] text-sm italic pl-[25%] mb-0.5">
        {line.text}
      </div>
    );
  }
  if (line.kind === "dialogue") {
    return (
      <div className="text-[#D4DEE0] text-sm leading-relaxed pl-[18%] pr-[15%] mb-2">
        {line.text}
      </div>
    );
  }
  // action
  return (
    <div className="text-[#B2C8C9] text-sm leading-relaxed my-2">
      {line.text}
    </div>
  );
}
