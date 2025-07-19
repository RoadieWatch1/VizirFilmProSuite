"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Film,
  ChevronDown,
  Loader2,
  Sparkles,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useFilmStore } from "@/lib/store";

interface ScriptLengthOption {
  label: string;
  value: string;
  isPro: boolean;
}

const scriptLengthOptions: ScriptLengthOption[] = [
  { label: "1 min (Short)", value: "1 min", isPro: false },
  { label: "5 min (Short)", value: "5 min", isPro: false },
  { label: "10 min (Short)", value: "10 min", isPro: true },
  { label: "15 min (Medium)", value: "15 min", isPro: true },
  { label: "30 min (Medium)", value: "30 min", isPro: true },
  { label: "60 min (Full Feature)", value: "60 min", isPro: true },
  { label: "120 min (Full Feature)", value: "120 min", isPro: true },
];

const genreList: string[] = [
  "Action",
  "Adventure",
  "Animation",
  "Biography",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Film Noir",
  "History",
  "Horror",
  "Musical",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Sport",
  "Superhero",
  "Thriller",
  "War",
  "Western",
  "Psychological",
  "Supernatural",
  "Post-Apocalyptic",
  "Cyberpunk",
  "Steampunk",
  "Coming-of-Age",
  "Dark Comedy",
  "Romantic Comedy",
  "Mockumentary",
  "Found Footage",
  "Experimental",
  "Indie",
  "Art House",
];

export default function HomePage() {
  const router = useRouter();
  const { updateFilmPackage } = useFilmStore();

  const [movieIdea, setMovieIdea] = useState("");
  const [movieGenre, setMovieGenre] = useState("");
  const [scriptLength, setScriptLength] = useState("1 min (Short)");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);

  const isSubscribed = false;

  const handleGenerate = async () => {
    if (!movieIdea.trim() || !movieGenre.trim()) {
      setError("Please provide both a movie idea and genre.");
      return;
    }

    const selectedOption = scriptLengthOptions.find(
      (opt) => opt.label === scriptLength
    );

    if (selectedOption?.isPro && !isSubscribed) {
      router.push("/upgrade");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingMessage("Generating your film package...");

    try {
      console.log("🎬 Generating film package:", {
        movieIdea,
        movieGenre,
        scriptLength,
      });

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieIdea,
          movieGenre,
          scriptLength,
          provider: "openai",
        }),
      });

      if (!res.ok) {
        const errorResponse = await res.json();
        throw new Error(errorResponse?.error || "API error");
      }

      const data = await res.json();

      updateFilmPackage({
        idea: movieIdea,
        genre: movieGenre,
        length: scriptLength,
        script: data.script || "",
        logline: data.logline || "",
        synopsis: data.synopsis || "",
        themes: data.themes || [],
        characters: data.characters || [],
        storyboard: data.storyboard || [],
        soundAssets: data.soundAssets || [],
      });

      alert(
        "Film package generated successfully! Check other tabs for your content."
      );
    } catch (err: any) {
      console.error(err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to generate film package.";
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // ✅ Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowLengthDropdown(false);
      setShowGenreDropdown(false);
    };

    if (showLengthDropdown || showGenreDropdown) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [showLengthDropdown, showGenreDropdown]);

  return (
    <div className="min-h-screen cinematic-gradient relative overflow-hidden">
      {/* Background Film Icon */}
      <div className="film-icon-bg">
        <Film size={500} className="text-[#FF6A00]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Film className="w-10 h-10 text-[#FF6A00]" />
              <h1 className="text-4xl font-bold text-white">
                Vizir Film Pro Suite
              </h1>
            </div>
            <p className="text-xl text-[#B2C8C9] max-w-2xl mx-auto">
              Transform your ideas into complete film packages with Vizir Film Generator
              
            </p>
          </div>

          {/* Generation Form */}
          <Card className="glass-effect border-[#FF6A00]/20 p-8 mb-8">
            <div className="space-y-6 relative overflow-visible">
              {/* Movie Idea Input */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Describe Your Film Idea
                </label>
                <Textarea
                  placeholder="A detective investigates mysterious disappearances in a small town..."
                  value={movieIdea}
                  onChange={(e) => setMovieIdea(e.target.value)}
                  className="bg-[#032f30] border-[#FF6A00]/20 text-white placeholder:text-[#B2C8C9] focus:border-[#FF6A00] min-h-[100px]"
                />
              </div>

              {/* Genre Selection */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Genre
                </label>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter genre (e.g. Sci-Fi, Thriller)"
                    value={movieGenre}
                    onChange={(e) => setMovieGenre(e.target.value)}
                    className="bg-[#032f30] border-[#FF6A00]/20 text-white placeholder:text-[#B2C8C9] focus:border-[#FF6A00]"
                  />
                  <div className="relative">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGenreDropdown(!showGenreDropdown);
                      }}
                      className="w-full justify-between border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                    >
                      Browse Genres
                      <ChevronDown className="w-4 h-4" />
                    </Button>

                    {showGenreDropdown &&
                      typeof document !== "undefined" &&
                      createPortal(
                        <div className="fixed left-1/2 top-[50%] w-[300px] -translate-x-1/2 z-[9999] bg-[#032f30] border border-[#FF6A00]/20 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-all duration-300">
                          {genreList.map((genre) => (
                            <button
                              key={genre}
                              onClick={() => {
                                setMovieGenre(genre);
                                setShowGenreDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-white hover:bg-[#FF6A00] hover:text-white transition-colors"
                            >
                              {genre}
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                  </div>
                </div>
              </div>

              {/* Script Length Selection */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Script Length
                </label>
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLengthDropdown(!showLengthDropdown);
                    }}
                    className="w-full justify-between border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                  >
                    {scriptLength}
                    <ChevronDown className="w-4 h-4" />
                  </Button>

                  {showLengthDropdown &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <div className="fixed left-1/2 top-[50%] w-[300px] -translate-x-1/2 z-[9999] bg-[#032f30] border border-[#FF6A00]/20 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-all duration-300">
                        {scriptLengthOptions.map((option) => (
                          <button
                            key={option.label}
                            onClick={() => {
                              if (option.isPro && !isSubscribed) {
                                router.push("/upgrade");
                              } else {
                                setScriptLength(option.label);
                                setShowLengthDropdown(false);
                              }
                            }}
                            className={`w-full text-left px-4 py-2 text-white hover:bg-[#FF6A00] hover:text-white transition-colors flex items-center justify-between ${
                              option.isPro && !isSubscribed
                                ? "opacity-50"
                                : ""
                            }`}
                          >
                            <span>{option.label}</span>
                            {option.isPro && (
                              <Crown className="w-4 h-4 text-yellow-400" />
                            )}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={loading || !movieIdea.trim() || !movieGenre.trim()}
                className="w-full bg-[#FF6A00] hover:bg-[#E55A00] text-white py-4 text-lg font-semibold disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Film Package
                  </>
                )}
              </Button>

              {error && (
                <div className="text-red-400 text-center p-3 bg-red-400/10 rounded-lg">
                  {error}
                </div>
              )}

              {loading && loadingMessage && (
                <div className="text-[#B2C8C9] text-center">
                  {loadingMessage}
                </div>
              )}
            </div>
          </Card>

          {/* Pro Features CTA */}
          <Card className="glass-effect border-yellow-400/20 p-6">
            <div className="text-center">
              <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Unlock Pro Features
              </h3>
              <p className="text-[#B2C8C9] mb-4">
                Get longer scripts, advanced storyboards, detailed budgets, and
                more.
              </p>
              <Button
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
                onClick={() => router.push("/upgrade")}
              >
                Upgrade to Pro
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
