"use client";

import { useState } from "react";
import { FileText, Save, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useFilmStore } from "@/lib/store";

export default function ScriptPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [script, setScript] = useState<string>(
    resolveScript(filmPackage?.script)
  );
  const [loading, setLoading] = useState(false);

  function resolveScript(value: any): string {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value
        .map((line) => {
          if (typeof line === "string") return line;
          if (line?.line) return line.line;
          return "";
        })
        .join("\n");
    }
    return "";
  }

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
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "generate-script",
          movieIdea: filmPackage.idea,
          movieGenre: filmPackage.genre,
          scriptLength: filmPackage.length || "5 min",
          provider: "openai",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API error:", errorData.error);
        alert(errorData.error || "Failed to generate script.");
        return;
      }

      const data = await res.json();

      // ✅ Get the new professional script text
      const safeScript = resolveScript(data.scriptText);

      setScript(safeScript);

      updateFilmPackage({
        script: safeScript,
        logline: data.logline,
        synopsis: data.synopsis,
        shortScript: data.shortScript || [],
      });

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
    return (
      (text.split("EXT.").length - 1) +
      (text.split("INT.").length - 1)
    );
  };

  const countCharacters = (text?: string): number => {
    if (typeof text !== "string") return 0;
    return text
      .split("\n")
      .filter(
        (line) =>
          line.trim() &&
          line === line.toUpperCase() &&
          !line.startsWith("INT.") &&
          !line.startsWith("EXT.")
      ).length;
  };

  const pageCount =
    typeof script === "string" ? Math.round(script.split("\n").length / 55) : 0;

  const estRuntime = `${pageCount} min`;

  if (!script) {
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <FileText className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                Script Editor
              </h1>
              <p className="text-[#B2C8C9]">
                Generate or write your screenplay
              </p>
            </div>

            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">
                No Script Yet
              </h3>
              <p className="text-[#B2C8C9] mb-6">
                Generate a script from your film idea or start writing from
                scratch
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
              <h1 className="text-3xl font-bold text-white mb-2">
                Script Editor
              </h1>
              <p className="text-[#B2C8C9]">
                Professional screenplay writing
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
              <div className="text-2xl font-bold text-[#FF6A00]">
                {pageCount}
              </div>
              <div className="text-sm text-[#B2C8C9]">Pages</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {countScenes(script)}
              </div>
              <div className="text-sm text-[#B2C8C9]">Scenes</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {countCharacters(script)}
              </div>
              <div className="text-sm text-[#B2C8C9]">Characters</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {estRuntime}
              </div>
              <div className="text-sm text-[#B2C8C9]">Est. Runtime</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}