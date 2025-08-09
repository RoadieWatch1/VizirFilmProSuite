"use client";

import { useState } from "react";
import { FileText, Save, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useFilmStore } from "@/lib/store";

type ServerStats = {
  estimatedPages?: number;
  targetMinutes?: number;
  sceneCount?: number;
  characterCount?: number;
};

type ScriptLine = string | { line?: string };

export default function ScriptPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [script, setScript] = useState<string>(resolveScript(filmPackage?.script));
  const [loading, setLoading] = useState(false);
  const [serverStats, setServerStats] = useState<ServerStats>({});

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
    if (s.includes("feature")) return 100;
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
    alert("Script saved successfully!");
  };

  const handleGenerateScript = async () => {
    if (!filmPackage?.idea || !filmPackage?.genre) {
      alert("Please generate a film package first from the Create tab.");
      return;
    }

    setLoading(true);
    setServerStats({});
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieIdea: filmPackage.idea,
          movieGenre: filmPackage.genre,
          scriptLength: filmPackage.length || "5 min",
          provider: "openai",
        }),
      });

      // Read as text first, then try JSON (prevents "Unexpected token" crashes)
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        const message = data?.error || data?.message || raw || "Failed to generate script.";
        console.error("API error:", message);
        alert(message);
        return;
      }

      const safeScript = resolveScript(data.scriptText ?? data.script);
      setScript(safeScript);

      updateFilmPackage({
        script: safeScript,
        logline: data.logline,
        synopsis: data.synopsis,
        shortScript: data.shortScript || [],
        themes: data.themes || [],
      });

      if (data.stats) {
        setServerStats({
          estimatedPages: data.stats.estimatedPages,
          targetMinutes: data.stats.targetMinutes,
          sceneCount: data.stats.sceneCount,
          characterCount: data.stats.characterCount,
        });
      } else {
        setServerStats({
          estimatedPages: estimatePagesByWords(safeScript),
          targetMinutes: parseDurationToMinutes(filmPackage.length),
          sceneCount: countScenes(safeScript),
          characterCount: countCharacters(safeScript),
        });
      }

      alert("Script generated successfully!");
    } catch (error) {
      console.error("Failed to generate script:", error);
      alert("Failed to generate script. Please try again.");
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
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <FileText className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Script Editor</h1>
              <p className="text-[#B2C8C9]">Generate or write your screenplay</p>
            </div>

            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">No Script Yet</h3>
              <p className="text-[#B2C8C9] mb-6">
                Generate a script from your film idea or start writing from scratch
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleGenerateScript}
                  disabled={loading}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                >
                  {loading ? "Generating..." : "Generate Script"}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                  onClick={() => setScript("FADE IN:\n\n")}
                >
                  Start Writing
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
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
                Target: {targetMinutes} minutes • Current: ~{shownPages} pages
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
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
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
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
                className="
                  w-full
                  h-96
                  bg-transparent
                  text-white
                  placeholder:text-[#B2C8C9]
                  border-none
                  resize-none
                  focus:outline-none
                  font-mono
                  text-base
                  md:text-lg
                  leading-relaxed
                "
                placeholder="Start writing your script..."
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
    </div>
  );
}
