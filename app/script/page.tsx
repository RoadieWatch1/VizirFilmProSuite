"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Save, Download, Upload, History, ClipboardList, Feather } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/EmptyState";
import ScriptHistoryPanel from "@/components/ScriptHistoryPanel";
import CoveragePanel from "@/components/CoveragePanel";
import { useFilmStore } from "@/lib/store";
import { useAuth } from "@/lib/useAuth";
import { createVersion } from "@/lib/versionsRepo";
import type { ScriptCoverage } from "@/lib/generators";

type ServerStats = {
  estimatedPages?: number;
  targetMinutes?: number;
  sceneCount?: number;
  characterCount?: number;
};

type ScriptLine = string | { line?: string };

export default function ScriptPage() {
  const { filmPackage, updateFilmPackage, activeProjectId } = useFilmStore();
  const { user } = useAuth();
  const [script, setScript] = useState<string>(resolveScript(filmPackage?.script));
  const [loading, setLoading] = useState(false);
  const [serverStats, setServerStats] = useState<ServerStats>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastAutosavedVersion = useRef<string>("");
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep editor in sync if store updates elsewhere (e.g., different tab regenerates)
  useEffect(() => {
    setScript(resolveScript(filmPackage?.script));
  }, [filmPackage?.script]);

  // Snapshot every 5 minutes if the script has changed since the last snapshot.
  useEffect(() => {
    if (!user?.uid || !activeProjectId) return;
    autosaveTimerRef.current = setInterval(() => {
      const trimmed = script?.trim();
      if (!trimmed) return;
      if (trimmed === lastAutosavedVersion.current) return;
      createVersion(user.uid, activeProjectId, script, { trigger: "autosave" })
        .then(() => {
          lastAutosavedVersion.current = trimmed;
        })
        .catch((err) => console.warn("Version autosave failed:", err));
    }, 5 * 60 * 1000);
    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [user?.uid, activeProjectId, script]);

  function resolveScript(value: unknown): string {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return (value as ScriptLine[])
        .map((line) => (typeof line === "string" ? line : line?.line ?? ""))
        .join("\n");
    }
    return "";
  }

  const parseDurationToMinutes = (raw?: string): number => {
    if (!raw) return 5;
    const s = String(raw).trim().toLowerCase();
    if (s.includes("feature")) return 120;
    if (s.includes("short")) return 10;

    const hr = s.match(/(\d+)\s*(h|hr|hour|hours)\b/);
    if (hr) {
      const h = parseInt(hr[1], 10);
      if (!isNaN(h)) return Math.max(1, h * 60);
    }
    const min = s.match(/(\d+)\s*(m|min|mins|minute|minutes)?\b/);
    if (min) {
      const m = parseInt(min[1], 10);
      if (!isNaN(m)) return Math.max(1, m);
    }
    return 5;
  };

  const wordsPerPage = 220;
  const estimatePagesByWords = (text?: string) => {
    if (typeof text !== "string" || !text.trim()) return 0;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / wordsPerPage));
  };

  const handleSave = () => {
    updateFilmPackage({ script });
    toast.success("Script saved successfully");
    if (user?.uid && activeProjectId && script.trim()) {
      createVersion(user.uid, activeProjectId, script, { trigger: "manual" })
        .then(() => {
          lastAutosavedVersion.current = script.trim();
        })
        .catch((err) => console.warn("Snapshot on save failed:", err));
    }
  };

  const handleExportScreenplay = async (format: "fdx" | "fountain") => {
    if (!script.trim()) {
      toast.error("Write or generate a script before exporting.");
      return;
    }
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          filmPackage: { ...(filmPackage || {}), script },
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.error || `Failed to export ${format.toUpperCase()}.`);
        return;
      }
      const blob = await res.blob();
      const slug = (filmPackage?.idea || "screenplay")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 48) || "screenplay";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.${format === "fdx" ? "fdx" : "fountain"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(
        format === "fdx"
          ? "Final Draft (.fdx) downloaded. Open it in Final Draft 10+."
          : "Fountain (.fountain) downloaded.",
      );
    } catch (err: any) {
      console.error("Screenplay export failed:", err);
      toast.error("Screenplay export failed.");
    }
  };

  const handleRestoreVersion = (content: string) => {
    setScript(content);
    updateFilmPackage({ script: content });
    if (user?.uid && activeProjectId) {
      createVersion(user.uid, activeProjectId, content, { trigger: "restore" }).catch(
        (err) => console.warn("Snapshot on restore failed:", err),
      );
    }
  };

  const handleGenerateScript = async () => {
    if (!filmPackage?.idea || !filmPackage?.genre) {
      toast.error("Please generate a film package first from the Create tab.");
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setServerStats({});
    setScript("");

    try {
      const res = await fetch("/api/stream-script", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieIdea: filmPackage.idea,
          movieGenre: filmPackage.genre,
          scriptLength: filmPackage.length || "5 min",
          logline: filmPackage.logline || "",
          synopsis: filmPackage.synopsis || "",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        let message = "Failed to generate script.";
        try {
          const raw = await res.text();
          const data = raw ? JSON.parse(raw) : {};
          message = data?.error || raw || message;
        } catch {}
        toast.error(message);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        accumulated += chunk;
        setScript(accumulated);
      }
      accumulated += decoder.decode();
      if (accumulated) setScript(accumulated);

      if (/\[ERROR\]/.test(accumulated.slice(-300))) {
        toast.error("Stream ended with an error. See script for details.");
      } else {
        updateFilmPackage({ script: accumulated });
        setServerStats({
          estimatedPages: estimatePagesByWords(accumulated),
          targetMinutes: parseDurationToMinutes(filmPackage.length),
          sceneCount: countScenes(accumulated),
          characterCount: countCharacters(accumulated),
        });
        if (user?.uid && activeProjectId && accumulated.trim()) {
          createVersion(user.uid, activeProjectId, accumulated, { trigger: "generate" })
            .then(() => {
              lastAutosavedVersion.current = accumulated.trim();
            })
            .catch((err) => console.warn("Snapshot on generate failed:", err));
        }
        toast.success("Script generated successfully");
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.warn("Generate script aborted");
      } else {
        console.error("Failed to generate script:", error);
        toast.error("Failed to generate script. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const countScenes = (text?: string): number => {
    if (typeof text !== "string") return 0;
    return (text.match(/^(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/gim) || []).length;
  };

  const countCharacters = (text?: string): number => {
    if (typeof text !== "string") return 0;
    // Heuristic: uppercase lines that aren't scene headings and not too long
    return text
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        if (!t) return false;
        if (/^(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/.test(t)) return false;
        return t === t.toUpperCase() && t.length <= 30;
      }).length;
  };

  const localPageCount = estimatePagesByWords(script);
  const targetMinutes = serverStats.targetMinutes ?? parseDurationToMinutes(filmPackage?.length);
  const shownPages = serverStats.estimatedPages ?? localPageCount;
  const estRuntime = `${shownPages} min`;

  if (!script) {
    const hasPrereqs = !!(filmPackage?.idea && filmPackage?.genre);
    return (
      <EmptyState
        icon={FileText}
        title="Script Editor"
        subtitle="Generate a professional screenplay or write from scratch"
        emptyTitle="No script yet"
        emptyDescription="Generate a feature-quality screenplay from your idea with proper Fountain formatting, or start a blank page and write yourself."
        needsPrerequisite={!hasPrereqs}
        prerequisiteMessage="Enter your film idea and genre on the Create tab to generate a script tailored to your story."
        actionLabel="Generate Script"
        actionLoadingLabel="Writing screenplay..."
        onAction={handleGenerateScript}
        loading={loading}
        extra={
          hasPrereqs ? (
            <Button
              variant="outline"
              className="border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              onClick={() => setScript("FADE IN:\n\n")}
            >
              Start Writing from Scratch
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Script Editor</h1>
              <p className="text-[#B2C8C9]">Professional screenplay writing</p>
              <p className="text-[#B2C8C9] text-sm mt-1">
                Target: {targetMinutes} minutes (~{targetMinutes} pages) • Current: ~{shownPages} pages
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              {loading && (
                <span className="inline-flex items-center gap-2 text-sm text-[#FF6A00]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6A00] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF6A00]" />
                  </span>
                  Streaming…
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCoverageOpen(true)}
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                title="AI script coverage"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Coverage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                disabled={!user?.uid || !activeProjectId}
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                title={
                  !user?.uid
                    ? "Sign in to use history"
                    : !activeProjectId
                    ? "Open a project to use history"
                    : "Version history"
                }
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportScreenplay("fdx")}
                disabled={loading || !script.trim()}
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                title="Export as Final Draft (.fdx)"
              >
                <Download className="w-4 h-4 mr-2" />
                .fdx
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportScreenplay("fountain")}
                disabled={loading || !script.trim()}
                className="border-[#7AE2CF]/30 text-[#7AE2CF] hover:bg-[#7AE2CF] hover:text-[#091416]"
                title="Export as Fountain"
              >
                <Feather className="w-4 h-4 mr-2" />
                .fountain
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          {/* Script Editor */}
          <Card className="glass-effect border-[#FF6A00]/20">
            <div className="p-6">
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="screenplay-editor min-h-[70vh] w-full border-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="FADE IN:&#10;&#10;INT. LOCATION - DAY&#10;&#10;Start writing your screenplay..."
              />
            </div>
          </Card>

          {/* Script Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">{shownPages}</div>
              <div className="text-sm text-[#B2C8C9]">Pages (est.)</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {serverStats.sceneCount ?? countScenes(script)}
              </div>
              <div className="text-sm text-[#B2C8C9]">Scenes</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {serverStats.characterCount ?? countCharacters(script)}
              </div>
              <div className="text-sm text-[#B2C8C9]">Characters</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">{estRuntime}</div>
              <div className="text-sm text-[#B2C8C9]">Est. Runtime</div>
            </Card>
          </div>
        </div>
      </div>

      <ScriptHistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        uid={user?.uid || null}
        projectId={activeProjectId}
        currentScript={script}
        onRestore={handleRestoreVersion}
      />

      <CoveragePanel
        open={coverageOpen}
        onOpenChange={setCoverageOpen}
        script={script}
        genre={filmPackage?.genre}
        title={filmPackage?.idea}
        logline={filmPackage?.logline}
        coverage={filmPackage?.coverage}
        onCoverage={(coverage: ScriptCoverage) => updateFilmPackage({ coverage })}
      />
    </div>
  );
}
