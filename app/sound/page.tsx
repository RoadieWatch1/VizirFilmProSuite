// app/sound/page.tsx
"use client";

import { useState, useRef } from "react";
import {
  Music,
  Plus,
  Play,
  Pause,
  Loader2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilmStore } from "@/lib/store";

interface SoundAsset {
  name: string;
  type: "music" | "sfx" | "dialogue" | "ambient";
  duration: string;
  description: string;
  scenes?: string[];
  audioUrl?: string;
}

export default function SoundPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const soundAssets: SoundAsset[] = filmPackage?.soundAssets || [];

  const handleGenerateSound = async () => {
    if (!filmPackage?.script || !filmPackage?.genre) {
      alert("Please generate a script first from the Create tab.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: filmPackage.script,
          genre: filmPackage.genre,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to generate sound assets");
      }

      const data = await res.json();
      console.log("Generated SoundAssets:", data.soundAssets);

      const cleanAssets = (data.soundAssets || []).filter((a: SoundAsset) => !!a.audioUrl);

      updateFilmPackage({
        soundAssets: cleanAssets,
      });
    } catch (err: any) {
      console.error("Failed to generate sound assets:", err);
      setError(err?.message || "An error occurred while generating sound assets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSoundAssets = async () => {
    if (soundAssets.length === 0) {
      alert("No sound assets to download. Please generate sound design first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/download-sound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ soundAssets }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to download sound assets.");
      }

      // Create blob and download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sound_design_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert("✅ Sound design package downloaded successfully!");
    } catch (error: any) {
      console.error("Failed to download sound assets:", error);
      alert("Failed to download. Please check that audio files are available.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (id: string, audioUrl?: string) => {
    if (playingId === id) {
      setPlayingId(null);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setPlayingId(id);
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch((e) => {
          console.error("❌ Audio playback error:", e);
        });
      } else {
        console.warn("⚠️ No audio URL found for this asset.");
      }
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "music":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "sfx":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "dialogue":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "ambient":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (soundAssets.length === 0) {
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Music className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Sound Library</h1>
              <p className="text-[#B2C8C9]">
                Manage music, sound effects, and audio assets
              </p>
            </div>

            {error && (
              <div className="text-red-400 text-center p-3 bg-red-400/10 rounded-lg mb-4">
                {error}
              </div>
            )}

            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">No Sound Assets Yet</h3>
              <p className="text-[#B2C8C9] mb-6">
                Generate sound recommendations based on your script or add assets manually.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleGenerateSound}
                  disabled={loading}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Sound Design"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Sound Library</h1>
              <p className="text-[#B2C8C9]">Audio assets and sound design</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleDownloadSoundAssets}
                disabled={loading || soundAssets.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white mt-4 md:mt-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Package
              </Button>
              <Button className="bg-[#FF6A00] hover:bg-[#E55A00] text-white mt-4 md:mt-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {soundAssets.map((asset, index) => {
              const isPlaying = playingId === index.toString();
              return (
                <Card
                  key={index}
                  className="glass-effect border-[#FF6A00]/20 p-6 hover-lift"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-12 bg-[#032f30] rounded-lg flex items-center justify-center">
                      <div className="flex items-center space-x-1">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-[#FF6A00] rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 20 + 10}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{asset.name}</h3>
                        <Badge className={`${getTypeColor(asset.type)} border text-xs`}>
                          {asset.type}
                        </Badge>
                        <span className="text-[#8da3a4] text-sm">{asset.duration}</span>
                      </div>

                      <p className="text-[#B2C8C9] text-base mb-2">{asset.description}</p>

                      {asset.scenes && (
                        <div className="flex flex-wrap gap-1">
                          {asset.scenes.map((scene, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs bg-[#032f30] text-[#B2C8C9]"
                            >
                              {scene}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {!asset.audioUrl && (
                        <p className="text-red-500 text-sm mt-1">
                          ⚠️ Audio not available for this asset
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(index.toString(), asset.audioUrl)}
                      className={`p-3 rounded-full ${
                        isPlaying
                          ? "bg-[#FF6A00] text-white hover:bg-[#E55A00]"
                          : "text-[#8da3a4] hover:text-white hover:bg-[#14484a]"
                      }`}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">{soundAssets.length}</div>
              <div className="text-sm text-[#B2C8C9]">Total Assets</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {soundAssets.filter((a) => a.type === "music").length}
              </div>
              <div className="text-sm text-[#B2C8C9]">Music Tracks</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {soundAssets.filter((a) => a.type === "sfx").length}
              </div>
              <div className="text-sm text-[#B2C8C9]">Sound Effects</div>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
              <div className="text-2xl font-bold text-[#FF6A00]">
                {soundAssets.filter((a) => a.type === "dialogue").length}
              </div>
              <div className="text-sm text-[#B2C8C9]">Dialogue</div>
            </Card>
          </div>
        </div>
      </div>
      <audio ref={audioRef} hidden />
    </div>
  );
}