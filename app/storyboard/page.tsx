"use client";

import { useState } from "react";
import {
  Image as LucideImage,
  Plus,
  Camera,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilmStore } from "@/lib/store";

import type { StoryboardFrame } from "@/lib/generators";

export default function StoryboardPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [storyboard, setStoryboard] = useState<StoryboardFrame[]>(
    filmPackage?.storyboard || []
  );
  const [loading, setLoading] = useState(false);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "storyboard",
          movieIdea: filmPackage.idea,
          movieGenre: filmPackage.genre,
          scriptLength: filmPackage.length || "5 min",
          script:
            filmPackage.shortScript && filmPackage.shortScript.length > 0
              ? JSON.stringify(filmPackage.shortScript, null, 2)
              : filmPackage.script || "",
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
      console.log("Storyboard result:", data);

      let frames: StoryboardFrame[] = [];

      if (Array.isArray(data.storyboard)) {
        frames = data.storyboard.map((item: any, idx: number) => ({
          scene: item.scene || `Scene ${idx + 1}`,
          shotNumber: item.shotNumber || "",
          description: item.description || "",
          cameraAngle: item.cameraAngle || "",
          cameraMovement: item.cameraMovement || "",
          lens: item.lens || "",
          lighting: item.lighting || "",
          duration: item.duration || "",
          dialogue: item.dialogue || "",
          soundEffects: item.soundEffects || "",
          notes: item.notes || "",
          imagePrompt: item.imagePrompt || "",
          imageUrl: item.imageUrl || "",
          coverageShots: Array.isArray(item.coverageShots)
            ? item.coverageShots.map((shot: any, shotIdx: number) => ({
                scene: shot.scene || `Coverage Shot ${shotIdx + 1}`,
                shotNumber: shot.shotNumber || "",
                description: shot.description || "",
                cameraAngle: shot.cameraAngle || "",
                cameraMovement: shot.cameraMovement || "",
                lens: shot.lens || "",
                lighting: shot.lighting || "",
                duration: shot.duration || "",
                dialogue: shot.dialogue || "",
                soundEffects: shot.soundEffects || "",
                notes: shot.notes || "",
                imagePrompt: shot.imagePrompt || "",
                imageUrl: shot.imageUrl || "",
              }))
            : [],
        }));
      } else if (typeof data.storyboard === "string") {
        frames = data.storyboard
          .split("\n")
          .filter((line: string) => line.trim() !== "")
          .map((line: string, idx: number) => ({
            scene: `Scene ${idx + 1}`,
            shotNumber: "",
            description: line,
            cameraAngle: "",
            cameraMovement: "",
            lens: "",
            lighting: "",
            duration: "",
            dialogue: "",
            soundEffects: "",
            notes: "",
            imagePrompt: "",
            imageUrl: "",
            coverageShots: [],
          }));
      }

      setStoryboard(frames);
      updateFilmPackage({ storyboard: frames });

      alert("Storyboard generated successfully!");
    } catch (error) {
      console.error("Failed to generate storyboard:", error);
      alert("An error occurred while generating the storyboard.");
    } finally {
      setLoading(false);
    }
  };

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
                Visual planning and shot sequencing
              </p>
            </div>

            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">
                No Storyboard Yet
              </h3>
              <p className="text-[#B2C8C9] mb-6">
                Generate a storyboard from your script or create frames
                manually.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleGenerateStoryboard}
                  disabled={loading || storyboard.length > 0}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Storyboard"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Frame
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
                Storyboard
              </h1>
              <p className="text-[#B2C8C9]">
                Professional storyboard with detailed camera and lighting
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Button
                variant="outline"
                size="sm"
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          {/* Storyboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storyboard.map((frame, index) => (
              <Card
                key={index}
                className="glass-effect border-[#FF6A00]/20 overflow-hidden hover-lift"
              >
                {/* Frame Image or Placeholder */}
                {frame.imageUrl ? (
                  <img
                    src={frame.imageUrl}
                    alt={frame.scene}
                    className="w-full h-auto object-cover aspect-video"
                  />
                ) : (
                  <div className="aspect-video bg-[#032f30] flex items-center justify-center">
                    <Camera className="w-12 h-12 text-[#8da3a4]" />
                  </div>
                )}

                {/* Frame Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {frame.scene}
                    </h3>
                    {frame.duration && (
                      <Badge
                        variant="secondary"
                        className="bg-[#FF6A00]/20 text-[#FF6A00]"
                      >
                        {frame.duration}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[#B2C8C9] text-sm">
                    <strong>Shot Number:</strong> {frame.shotNumber || "—"}
                  </div>
                  <div className="text-[#B2C8C9] text-base">
                    <strong>Description:</strong> {frame.description}
                  </div>
                  {frame.cameraAngle && (
                    <div className="text-[#B2C8C9] text-sm">
                      <strong>Camera Angle:</strong> {frame.cameraAngle}
                    </div>
                  )}
                  {frame.cameraMovement && (
                    <div className="text-[#B2C8C9] text-sm">
                      <strong>Camera Movement:</strong> {frame.cameraMovement}
                    </div>
                  )}
                  {frame.lens && (
                    <div className="text-[#B2C8C9] text-sm">
                      <strong>Lens:</strong> {frame.lens}
                    </div>
                  )}
                  {frame.lighting && (
                    <div className="text-[#B2C8C9] text-sm">
                      <strong>Lighting:</strong> {frame.lighting}
                    </div>
                  )}
                  {frame.dialogue && (
                    <div className="text-[#B2C8C9] text-sm">
                      <strong>Dialogue:</strong> {frame.dialogue}
                    </div>
                  )}
                  {frame.soundEffects && (
                    <div className="text-[#B2C8C9] text-sm">
                      <strong>Sound Effects:</strong> {frame.soundEffects}
                    </div>
                  )}
                  <p className="text-[#8da3a4] text-xs">
                    <strong>Notes:</strong> {frame.notes || "—"}
                  </p>

                  {/* Coverage Shots */}
                  {frame.coverageShots && frame.coverageShots.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-[#FF6A00] font-bold text-sm mb-2">
                        Coverage Shots:
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {frame.coverageShots.map((shot, shotIdx) => (
                          <div
                            key={shotIdx}
                            className="border border-[#FF6A00]/30 rounded overflow-hidden"
                          >
                            {shot.imageUrl ? (
                              <img
                                src={shot.imageUrl}
                                alt={shot.scene}
                                className="w-full h-auto object-cover aspect-video"
                              />
                            ) : (
                              <div className="aspect-video bg-[#032f30] flex items-center justify-center">
                                <Camera className="w-8 h-8 text-[#8da3a4]" />
                              </div>
                            )}
                            <div className="p-2 text-xs text-[#B2C8C9]">
                              <div className="font-semibold">
                                {shot.cameraAngle || "Coverage Shot"}
                              </div>
                              <div className="truncate">
                                {shot.description || "No description."}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Storyboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {storyboard.length}
              </div>
              <div className="text-sm text-[#B2C8C9]">Frames</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {storyboard.reduce((sum, frame) => {
                  return sum + (frame.duration ? parseFloat(frame.duration) : 0);
                }, 0)}
              </div>
              <div className="text-sm text-[#B2C8C9]">Total Seconds</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {storyboard.length}
              </div>
              <div className="text-sm text-[#B2C8C9]">Scenes</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {(
                  storyboard.reduce((sum, frame) => {
                    return sum + (frame.duration ? parseFloat(frame.duration) : 0);
                  }, 0) / (storyboard.length || 1)
                ).toFixed(1)}
              </div>
              <div className="text-sm text-[#B2C8C9]">Avg Duration</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
