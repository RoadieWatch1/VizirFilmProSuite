"use client";

import { useState } from "react";
import {
  Image as LucideImage,
  Camera,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Move,
  Eye,
  Lightbulb,
  Crosshair,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilmStore } from "@/lib/store";

import type { StoryboardFrame } from "@/lib/generators";

/** Parse a shot from the API response into our local type */
function parseShot(item: any, idx: number): StoryboardFrame {
  return {
    scene: item.scene || `Scene ${idx + 1}`,
    shotNumber: item.shotNumber || "",
    description: item.description || "",
    shotSize: item.shotSize || "",
    cameraAngle: item.cameraAngle || "",
    cameraMovement: item.cameraMovement || "",
    lens: item.lens || "",
    lighting: item.lighting || "",
    composition: item.composition || "",
    duration: item.duration || "",
    dialogue: item.dialogue || "",
    soundEffects: item.soundEffects || "",
    actionNotes: item.actionNotes || "",
    transition: item.transition || "",
    notes: item.notes || "",
    imagePrompt: item.imagePrompt || "",
    imageUrl: item.imageUrl || "",
    coverageShots: Array.isArray(item.coverageShots)
      ? item.coverageShots.map((shot: any, sIdx: number) => parseShot(shot, sIdx))
      : [],
  };
}

/** Shot size badge color */
function shotSizeColor(size: string): string {
  const s = (size || "").toUpperCase();
  if (s.includes("ECU") || s.includes("EXTREME CLOSE")) return "bg-red-500/20 text-red-400";
  if (s.includes("CU") || s.includes("CLOSE")) return "bg-orange-500/20 text-orange-400";
  if (s.includes("MCU") || s.includes("MEDIUM CLOSE")) return "bg-amber-500/20 text-amber-400";
  if (s.includes("MS") || s.includes("MEDIUM SHOT")) return "bg-yellow-500/20 text-yellow-400";
  if (s.includes("MLS") || s.includes("MEDIUM LONG")) return "bg-lime-500/20 text-lime-400";
  if (s.includes("LS") || s.includes("LONG SHOT")) return "bg-green-500/20 text-green-400";
  if (s.includes("ELS") || s.includes("EXTREME LONG")) return "bg-teal-500/20 text-teal-400";
  if (s.includes("OS") || s.includes("OVER")) return "bg-cyan-500/20 text-cyan-400";
  if (s.includes("POV")) return "bg-purple-500/20 text-purple-400";
  if (s.includes("2-SHOT") || s.includes("TWO")) return "bg-blue-500/20 text-blue-400";
  return "bg-[#FF6A00]/20 text-[#FF6A00]";
}

/** Get unique scene names from storyboard */
function getUniqueScenes(frames: StoryboardFrame[]): string[] {
  const seen = new Set<string>();
  return frames
    .map((f) => f.scene)
    .filter((s) => {
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

export default function StoryboardPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [storyboard, setStoryboard] = useState<StoryboardFrame[]>(
    filmPackage?.storyboard || []
  );
  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<number>>(new Set());
  const [expandedFrames, setExpandedFrames] = useState<Set<number>>(new Set());

  const toggleExpand = (idx: number) => {
    setExpandedFrames((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleGenerateStoryboard = async () => {
    if (!filmPackage?.idea || !filmPackage?.genre) {
      alert("Please generate a film package first from the Create tab.");
      return;
    }
    if (storyboard.length > 0) {
      alert("Storyboard has already been generated for this script.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "storyboard",
          movieIdea: filmPackage.idea,
          movieGenre: filmPackage.genre,
          scriptLength: filmPackage.length || "5 min",
          script: filmPackage.script || "",
          characters: filmPackage.characters || [],
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error(errorData);
        alert("Failed to generate storyboard.");
        return;
      }
      const data = await res.json();
      let frames: StoryboardFrame[] = [];
      if (Array.isArray(data.storyboard)) {
        frames = data.storyboard.map(parseShot);
      }
      setStoryboard(frames);
      updateFilmPackage({ storyboard: frames });
    } catch (error) {
      console.error("Failed to generate storyboard:", error);
      alert("An error occurred while generating the storyboard.");
    } finally {
      setLoading(false);
    }
  };

  // Track generating state for coverage shots: "frameIdx-shotIdx"
  const [generatingCoverage, setGeneratingCoverage] = useState<Set<string>>(new Set());

  const handleGenerateImage = async (frameIdx: number) => {
    const frame = storyboard[frameIdx];
    if (!frame?.imagePrompt) return;
    setGeneratingImages((prev) => new Set(prev).add(frameIdx));
    try {
      const res = await fetch("/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "generate-frame-image",
          imagePrompt: frame.imagePrompt,
          shotNumber: frame.shotNumber,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to generate image.");
        return;
      }
      const data = await res.json();
      if (data.imageUrl) {
        const updated = [...storyboard];
        updated[frameIdx] = { ...updated[frameIdx], imageUrl: data.imageUrl };
        setStoryboard(updated);
        updateFilmPackage({ storyboard: updated });
      }
    } catch (error) {
      console.error("Image generation error:", error);
      alert("Failed to generate image.");
    } finally {
      setGeneratingImages((prev) => {
        const next = new Set(prev);
        next.delete(frameIdx);
        return next;
      });
    }
  };

  const handleGenerateCoverageImage = async (frameIdx: number, shotIdx: number) => {
    const frame = storyboard[frameIdx];
    const shot = frame?.coverageShots?.[shotIdx];
    if (!shot?.imagePrompt) return;
    const key = `${frameIdx}-${shotIdx}`;
    setGeneratingCoverage((prev) => new Set(prev).add(key));
    try {
      const res = await fetch("/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "generate-frame-image",
          imagePrompt: shot.imagePrompt,
          shotNumber: shot.shotNumber,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to generate coverage image.");
        return;
      }
      const data = await res.json();
      if (data.imageUrl) {
        const updated = [...storyboard];
        const updatedCoverage = [...(updated[frameIdx].coverageShots || [])];
        updatedCoverage[shotIdx] = { ...updatedCoverage[shotIdx], imageUrl: data.imageUrl };
        updated[frameIdx] = { ...updated[frameIdx], coverageShots: updatedCoverage };
        setStoryboard(updated);
        updateFilmPackage({ storyboard: updated });
      }
    } catch (error) {
      console.error("Coverage image generation error:", error);
      alert("Failed to generate coverage image.");
    } finally {
      setGeneratingCoverage((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Stats
  const uniqueScenes = getUniqueScenes(storyboard);
  const totalCoverage = storyboard.reduce(
    (sum, f) => sum + (f.coverageShots?.length || 0),
    0
  );
  const parseDuration = (d: string) => parseFloat(d) || 0;
  const totalSeconds = storyboard.reduce(
    (sum, f) => sum + parseDuration(f.duration || "0"),
    0
  );

  // --- Empty state ---
  if (storyboard.length === 0) {
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <LucideImage className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                Storyboard
              </h1>
              <p className="text-[#B2C8C9]">
                Professional shot-by-shot storyboard with B&W pencil sketches
              </p>
            </div>
            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">
                No Storyboard Yet
              </h3>
              <p className="text-[#B2C8C9] mb-6">
                Generate a professional storyboard from your script with detailed shot information, camera specs, and B&W pencil sketch images.
              </p>
              <Button
                onClick={handleGenerateStoryboard}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Storyboard...
                  </>
                ) : (
                  "Generate Storyboard"
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- Storyboard view ---
  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Storyboard
              </h1>
              <p className="text-[#B2C8C9] text-sm">
                {storyboard.length} shots across {uniqueScenes.length} scenes
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            <Card className="glass-effect border-[#FF6A00]/20 p-3 text-center">
              <div className="text-xl font-bold text-[#FF6A00]">{storyboard.length}</div>
              <div className="text-xs text-[#B2C8C9]">Main Shots</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-3 text-center">
              <div className="text-xl font-bold text-[#FF6A00]">{totalCoverage}</div>
              <div className="text-xs text-[#B2C8C9]">Coverage Shots</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-3 text-center">
              <div className="text-xl font-bold text-[#FF6A00]">{uniqueScenes.length}</div>
              <div className="text-xs text-[#B2C8C9]">Scenes</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-3 text-center">
              <div className="text-xl font-bold text-[#FF6A00]">{Math.round(totalSeconds)}s</div>
              <div className="text-xs text-[#B2C8C9]">Total Duration</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-3 text-center">
              <div className="text-xl font-bold text-[#FF6A00]">
                {storyboard.filter((f) => f.imageUrl).length + storyboard.reduce((sum, f) => sum + (f.coverageShots?.filter(s => s.imageUrl).length || 0), 0)}/{storyboard.length + totalCoverage}
              </div>
              <div className="text-xs text-[#B2C8C9]">Images Generated</div>
            </Card>
          </div>

          {/* Frames */}
          <div className="space-y-6">
            {storyboard.map((frame, index) => {
              const isExpanded = expandedFrames.has(index);
              return (
                <Card
                  key={index}
                  className="glass-effect border-[#FF6A00]/20 overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Image Panel */}
                    <div className="lg:w-[480px] flex-shrink-0 relative bg-[#0a1a1b]">
                      {frame.imageUrl ? (
                        <img
                          src={frame.imageUrl}
                          alt={`Shot ${frame.shotNumber}`}
                          className="w-full h-auto object-cover aspect-video"
                        />
                      ) : (
                        <div className="aspect-video flex flex-col items-center justify-center gap-3">
                          <Camera className="w-12 h-12 text-[#3a5556]" />
                          <Button
                            size="sm"
                            onClick={() => handleGenerateImage(index)}
                            disabled={generatingImages.has(index) || !frame.imagePrompt}
                            className="bg-[#FF6A00] hover:bg-[#E55A00] text-white text-xs"
                          >
                            {generatingImages.has(index) ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Sketching...
                              </>
                            ) : (
                              <>
                                <Pencil className="w-3 h-3 mr-1" />
                                Generate Sketch
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {/* Shot number overlay */}
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded">
                        #{frame.shotNumber || index + 1}
                      </div>
                      {/* Duration overlay */}
                      {frame.duration && (
                        <div className="absolute top-2 right-2 bg-black/70 text-[#FF6A00] text-xs font-mono px-2 py-1 rounded">
                          {frame.duration}
                        </div>
                      )}
                      {/* Transition overlay */}
                      {frame.transition && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-[#8da3a4] text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                          <ArrowRight className="w-2.5 h-2.5" />
                          {frame.transition}
                        </div>
                      )}
                    </div>

                    {/* Details Panel */}
                    <div className="flex-1 p-4 min-w-0">
                      {/* Top row: scene + badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold text-sm truncate">
                            {frame.scene}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {frame.shotSize && (
                            <Badge className={`text-[10px] px-1.5 py-0.5 font-mono ${shotSizeColor(frame.shotSize)}`}>
                              {frame.shotSize}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[#B2C8C9] text-sm mb-3 leading-relaxed">
                        {frame.description}
                      </p>

                      {/* Shot Details Grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                        {frame.cameraAngle && (
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3 h-3 text-[#FF6A00] flex-shrink-0" />
                            <span className="text-[#8da3a4]">Angle:</span>
                            <span className="text-[#B2C8C9] truncate">{frame.cameraAngle}</span>
                          </div>
                        )}
                        {frame.cameraMovement && (
                          <div className="flex items-center gap-1.5">
                            <Move className="w-3 h-3 text-[#FF6A00] flex-shrink-0" />
                            <span className="text-[#8da3a4]">Move:</span>
                            <span className="text-[#B2C8C9] truncate">{frame.cameraMovement}</span>
                          </div>
                        )}
                        {frame.lens && (
                          <div className="flex items-center gap-1.5">
                            <Crosshair className="w-3 h-3 text-[#FF6A00] flex-shrink-0" />
                            <span className="text-[#8da3a4]">Lens:</span>
                            <span className="text-[#B2C8C9] truncate">{frame.lens}</span>
                          </div>
                        )}
                        {frame.lighting && (
                          <div className="flex items-center gap-1.5">
                            <Lightbulb className="w-3 h-3 text-[#FF6A00] flex-shrink-0" />
                            <span className="text-[#8da3a4]">Light:</span>
                            <span className="text-[#B2C8C9] truncate">{frame.lighting}</span>
                          </div>
                        )}
                      </div>

                      {/* Composition */}
                      {frame.composition && (
                        <div className="text-xs text-[#8da3a4] mb-2">
                          <span className="text-[#FF6A00] font-semibold">Composition:</span>{" "}
                          <span className="text-[#B2C8C9]">{frame.composition}</span>
                        </div>
                      )}

                      {/* Dialogue */}
                      {frame.dialogue && (
                        <div className="bg-[#0a1a1b] rounded p-2 mb-2 border-l-2 border-[#FF6A00]/40">
                          <span className="text-[10px] text-[#FF6A00] uppercase font-semibold">Dialogue</span>
                          <p className="text-[#B2C8C9] text-xs italic mt-0.5">&ldquo;{frame.dialogue}&rdquo;</p>
                        </div>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(index)}
                        className="flex items-center gap-1 text-[10px] text-[#8da3a4] hover:text-[#FF6A00] transition-colors mt-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? "Less details" : "More details"}
                        {frame.coverageShots && frame.coverageShots.length > 0 && (
                          <span className="ml-1 text-[#FF6A00]">
                            + {frame.coverageShots.length} coverage
                          </span>
                        )}
                      </button>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#FF6A00]/10 space-y-2">
                          {frame.actionNotes && (
                            <div className="text-xs">
                              <span className="text-[#FF6A00] font-semibold">Action/Blocking:</span>{" "}
                              <span className="text-[#B2C8C9]">{frame.actionNotes}</span>
                            </div>
                          )}
                          {frame.soundEffects && (
                            <div className="text-xs">
                              <span className="text-[#FF6A00] font-semibold">Sound FX:</span>{" "}
                              <span className="text-[#B2C8C9]">{frame.soundEffects}</span>
                            </div>
                          )}
                          {frame.notes && (
                            <div className="text-xs">
                              <span className="text-[#FF6A00] font-semibold">Director Notes:</span>{" "}
                              <span className="text-[#8da3a4]">{frame.notes}</span>
                            </div>
                          )}

                          {/* Coverage Shots — 3 camera angles per scene */}
                          {frame.coverageShots && frame.coverageShots.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-[#FF6A00] font-semibold text-xs mb-2 uppercase tracking-wide">
                                Camera Angles ({frame.coverageShots.length} shots)
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {frame.coverageShots.map((shot, shotIdx) => {
                                  const coverageKey = `${index}-${shotIdx}`;
                                  const isGenerating = generatingCoverage.has(coverageKey);
                                  return (
                                    <div
                                      key={shotIdx}
                                      className="border border-[#FF6A00]/20 rounded bg-[#0a1a1b] overflow-hidden"
                                    >
                                      {shot.imageUrl ? (
                                        <img
                                          src={shot.imageUrl}
                                          alt={`${shot.shotNumber} - ${shot.shotSize}`}
                                          className="w-full h-auto object-cover aspect-video"
                                        />
                                      ) : (
                                        <div className="aspect-video bg-[#071414] flex flex-col items-center justify-center gap-2">
                                          <Camera className="w-6 h-6 text-[#2a3d3e]" />
                                          <Button
                                            size="sm"
                                            onClick={() => handleGenerateCoverageImage(index, shotIdx)}
                                            disabled={isGenerating || !shot.imagePrompt}
                                            className="bg-[#FF6A00] hover:bg-[#E55A00] text-white text-[10px] px-2 py-1 h-auto"
                                          >
                                            {isGenerating ? (
                                              <>
                                                <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
                                                Sketching...
                                              </>
                                            ) : (
                                              <>
                                                <Pencil className="w-2.5 h-2.5 mr-1" />
                                                Generate Sketch
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      )}
                                      <div className="p-2 space-y-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-mono text-white">
                                            #{shot.shotNumber}
                                          </span>
                                          {shot.shotSize && (
                                            <Badge className={`text-[9px] px-1 py-0 font-mono ${shotSizeColor(shot.shotSize)}`}>
                                              {shot.shotSize}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-[#B2C8C9] line-clamp-2">
                                          {shot.description}
                                        </p>
                                        {shot.lens && (
                                          <p className="text-[9px] text-[#8da3a4]">
                                            {shot.lens} {shot.cameraAngle ? `/ ${shot.cameraAngle}` : ""}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
