"use client";

import { useMemo, useState } from "react";
import dynamicImport from "next/dynamic";
import {
  Palette,
  Download,
  RefreshCw,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Camera,
  Sun,
  Shirt,
  Building2,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/EmptyState";
import { useFilmStore } from "@/lib/store";
import type { VisionBoard, VisionBoardCategory, VisionBoardPrompt } from "@/lib/generators";

const PDFDownloadLink = dynamicImport(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false },
) as any;

const VisionBoardDocument = dynamicImport(
  () => import("@/components/VisionBoardDocument"),
  { ssr: false },
) as any;

const CATEGORY_META: Record<
  VisionBoardCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  cinematography: { label: "Cinematography", icon: Camera, accent: "text-[#FF6A00]" },
  color_palette: { label: "Color Palette", icon: Palette, accent: "text-[#7AE2CF]" },
  lighting: { label: "Lighting", icon: Sun, accent: "text-[#F5C36B]" },
  costume: { label: "Costume", icon: Shirt, accent: "text-[#E89AC7]" },
  production_design: { label: "Production Design", icon: Building2, accent: "text-[#9EB8FF]" },
  location: { label: "Location", icon: MapPin, accent: "text-[#8BE4A8]" },
};

function hasMinimumInputs(pkg: any) {
  return !!(pkg?.logline || pkg?.synopsis || pkg?.concept || pkg?.script);
}

export default function VisionBoardPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const minimumReady = hasMinimumInputs(filmPackage);
  const board: VisionBoard | undefined = filmPackage?.visionBoard;
  const prompts = board?.prompts || [];

  const fileName = useMemo(() => {
    const base =
      (filmPackage?.idea || "vision-board")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "vision-board";
    return `${base}-vision-board.pdf`;
  }, [filmPackage?.idea]);

  const dateString = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const imagesReady = prompts.length > 0 && prompts.every((p) => !!p.imageUrl);
  const imagesCount = prompts.filter((p) => !!p.imageUrl).length;

  const handleGeneratePrompts = async () => {
    if (!minimumReady) {
      toast.error("Write a logline, synopsis, or concept first.");
      return;
    }
    setGeneratingPrompts(true);
    try {
      const res = await fetch("/api/vision-board", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "generate-prompts",
          title: filmPackage?.idea,
          logline: filmPackage?.logline,
          synopsis: filmPackage?.synopsis,
          genre: filmPackage?.genre,
          themes: filmPackage?.themes,
          concept: filmPackage?.concept,
          script: filmPackage?.script,
        }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}
      if (!res.ok || !data?.visionBoard) {
        toast.error(data?.error || "Vision board generation failed.");
        return;
      }
      updateFilmPackage({ visionBoard: data.visionBoard as VisionBoard });
      toast.success("Vision board prompts ready — generate images next.");
    } catch (err: any) {
      toast.error(err?.message || "Request failed");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const generateImageFor = async (p: VisionBoardPrompt): Promise<string | null> => {
    const res = await fetch("/api/vision-board", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "generate-image", imagePrompt: p.imagePrompt }),
    });
    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {}
    if (!res.ok || !data?.imageUrl) {
      throw new Error(data?.error || "Image generation failed.");
    }
    return data.imageUrl as string;
  };

  const persistPrompts = (next: VisionBoardPrompt[]) => {
    updateFilmPackage({
      visionBoard: {
        prompts: next,
        generatedAt: board?.generatedAt || Date.now(),
      },
    });
  };

  const handleGenerateImage = async (index: number) => {
    const p = prompts[index];
    if (!p) return;
    setGeneratingIdx(index);
    try {
      const url = await generateImageFor(p);
      if (!url) return;
      const next = prompts.slice();
      next[index] = { ...p, imageUrl: url, generatedAt: Date.now() };
      persistPrompts(next);
      toast.success(`Image ready — ${p.title}`);
    } catch (err: any) {
      toast.error(err?.message || "Image generation failed.");
    } finally {
      setGeneratingIdx(null);
    }
  };

  const handleGenerateAll = async () => {
    if (prompts.length === 0) return;
    setGeneratingAll(true);
    let next = prompts.slice();
    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < next.length; i++) {
      if (next[i].imageUrl) continue;
      setGeneratingIdx(i);
      try {
        const url = await generateImageFor(next[i]);
        if (url) {
          next = next.slice();
          next[i] = { ...next[i], imageUrl: url, generatedAt: Date.now() };
          persistPrompts(next);
          succeeded++;
        }
      } catch (err: any) {
        failed++;
        toast.error(`Panel ${i + 1}: ${err?.message || "failed"}`);
      }
    }
    setGeneratingIdx(null);
    setGeneratingAll(false);
    if (succeeded > 0) toast.success(`Rendered ${succeeded} panel${succeeded === 1 ? "" : "s"}.`);
    if (failed === 0 && succeeded === 0) toast.info("All panels already have images.");
  };

  if (!filmPackage || !minimumReady) {
    return (
      <EmptyState
        icon={Palette}
        title="Director's Vision Board"
        subtitle="Ten cinematic reference panels — the look, feel, and color of your film"
        emptyTitle="No vision board yet"
        emptyDescription="Generate a curated vision board of cinematography, color palette, lighting, costume, production design, and location references. Exports to a polished PDF lookbook for your pitch deck."
        needsPrerequisite={!minimumReady}
        prerequisiteMessage="Write at least a logline, synopsis, or concept on the Create tab before generating a vision board."
        actionLabel="Generate Vision Board"
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Palette className="w-7 h-7 text-[#FF6A00]" />
                Director&apos;s Vision Board
              </h1>
              <p className="text-[#B2C8C9]">
                {filmPackage.idea || "Untitled"}
                {filmPackage.genre ? ` · ${filmPackage.genre}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
              <Button
                onClick={handleGeneratePrompts}
                disabled={generatingPrompts || generatingAll || generatingIdx !== null}
                variant="outline"
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                {generatingPrompts ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Curating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {prompts.length > 0 ? "Regenerate Prompts" : "Generate Prompts"}
                  </>
                )}
              </Button>

              {prompts.length > 0 && (
                <Button
                  onClick={handleGenerateAll}
                  disabled={generatingAll || generatingPrompts || imagesReady}
                  className="bg-[#7AE2CF] hover:bg-[#5fc9b5] text-[#091416]"
                >
                  {generatingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Rendering {imagesCount + 1}/{prompts.length}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      {imagesReady ? "All Images Ready" : "Generate All Images"}
                    </>
                  )}
                </Button>
              )}

              {prompts.length > 0 && (
                <PDFDownloadLink
                  document={
                    <VisionBoardDocument
                      title={filmPackage.idea || "Untitled"}
                      genre={filmPackage.genre}
                      prompts={prompts}
                      dateString={dateString}
                    />
                  }
                  fileName={fileName}
                >
                  {({ loading, error }: { loading: boolean; error: any }) => (
                    <Button
                      disabled={loading || !!error}
                      className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Rendering...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download Lookbook
                        </>
                      )}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </div>
          </div>

          {/* Status banner */}
          {prompts.length > 0 && (
            <Card className="glass-effect border-[#FF6A00]/20 p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-[#FF6A00]" />
                  <span className="text-white font-semibold">
                    {prompts.length} panels · {imagesCount} rendered
                  </span>
                  <span className="text-[#6E8B8D]">
                    {imagesReady
                      ? "— lookbook ready to export"
                      : "— generate images to complete the lookbook"}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Empty prompts state */}
          {prompts.length === 0 && !generatingPrompts && (
            <Card className="glass-effect border-[#FF6A00]/20 p-10 text-center">
              <Palette className="w-10 h-10 text-[#FF6A00] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Curate 10 cinematic references
              </h3>
              <p className="text-[#B2C8C9] max-w-xl mx-auto mb-6">
                We&apos;ll generate a director-grade prompt set covering cinematography,
                color palette, lighting, costume, production design, and location —
                then render each panel with DALL·E 3 in cinematic 16:9.
              </p>
              <Button
                onClick={handleGeneratePrompts}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Prompts
              </Button>
            </Card>
          )}

          {/* Panels grid */}
          {prompts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {prompts.map((p, i) => {
                const meta = CATEGORY_META[p.category];
                const Icon = meta?.icon || ImageIcon;
                const isGenerating = generatingIdx === i;
                const expanded = expandedPrompt === p.id;
                return (
                  <Card
                    key={p.id}
                    className="glass-effect border-[#FF6A00]/20 overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-video bg-[#0F2426] border-b border-[#1A3034]">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#6E8B8D]">
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#FF6A00]" />
                              <span className="text-xs uppercase tracking-widest">
                                Rendering...
                              </span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 mb-2" />
                              <span className="text-xs uppercase tracking-widest">
                                Image pending
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 bg-black/70 border border-white/10 text-white text-[10px] uppercase tracking-widest">
                        <Icon className={`w-3 h-3 mr-1 ${meta?.accent || "text-white"}`} />
                        {meta?.label || p.category}
                      </Badge>
                      <Badge className="absolute top-2 right-2 bg-black/70 border border-white/10 text-[#B2C8C9] text-[10px]">
                        {String(i + 1).padStart(2, "0")}
                      </Badge>
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-white font-semibold mb-1">{p.title}</h3>
                      <p className="text-[#B2C8C9] text-sm leading-relaxed mb-4">
                        {p.description}
                      </p>

                      <div className="mt-auto flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateImage(i)}
                          disabled={isGenerating || generatingAll || generatingPrompts}
                          className={
                            p.imageUrl
                              ? "bg-transparent border border-[#FF6A00]/30 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                              : "bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                          }
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Rendering
                            </>
                          ) : p.imageUrl ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                              Regenerate
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                              Generate Image
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExpandedPrompt(expanded ? null : p.id)
                          }
                          className="border-[#1A3034] text-[#6E8B8D] hover:text-white hover:bg-[#0F2426]"
                        >
                          {expanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                          <span className="ml-1 text-xs">Prompt</span>
                        </Button>
                      </div>

                      {expanded && (
                        <div className="mt-3 p-3 bg-[#091416] border border-[#1A3034] rounded text-xs text-[#B2C8C9] leading-relaxed font-mono whitespace-pre-wrap break-words">
                          {p.imagePrompt}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
