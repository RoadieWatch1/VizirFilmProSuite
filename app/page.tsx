// C:\Users\vizir\VizirPro\app\page.tsx
"use client";

import LoginModal from "@/components/LoginModal";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Film, ChevronDown, Loader2, Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useFilmStore } from "@/lib/store";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { uploadAudioFile } from "@/lib/storageUtils";
import { cn } from "@/lib/utils";
import type { SoundAsset } from "@/lib/store";

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
  const { user, loading: authLoading, logout } = useAuth();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [movieIdea, setMovieIdea] = useState("");
  const [movieGenre, setMovieGenre] = useState("");

  // ✅ Store the VALUE (e.g. "60 min"), not the label
  const [scriptLength, setScriptLength] = useState<string>("1 min");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const selectedOption = useMemo(() => {
    return scriptLengthOptions.find((opt) => opt.value === scriptLength) ?? scriptLengthOptions[0];
  }, [scriptLength]);

  const scriptLengthLabel = selectedOption?.label ?? scriptLength;

  // Check subscription status
  useEffect(() => {
    async function checkSubscription() {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          setIsSubscribed(userDoc.exists() && userDoc.data()?.isSubscribed === true);
        } catch (err) {
          console.error("Error checking subscription:", err);
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
      setSubscriptionLoading(false);
    }

    if (!authLoading) {
      checkSubscription();
    }
  }, [user, authLoading]);

  // Close dropdowns on outside click
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

  const handleProLengthClick = (option: ScriptLengthOption) => {
    // Close dropdown so the UI doesn't look "stuck"
    setShowLengthDropdown(false);

    // If user isn't logged in, open login modal first
    if (!user) {
      setShowLoginModal(true);
      setError(`"${option.value}" requires Pro. Please log in to upgrade.`);
      return;
    }

    // Logged in, but not subscribed -> go upgrade
    setError(`"${option.value}" requires Pro. Upgrade to unlock longer scripts.`);
    router.push("/upgrade");
  };

  const handleGenerate = async () => {
    // ✅ DEBUG PROOF: Always log what we're about to submit
    console.log("[Generate] Submitting:", {
      scriptLength,
      scriptLengthLabel,
      selectedOption,
      isSubscribed,
      isLoggedIn: !!user,
    });

    if (!movieIdea.trim() || !movieGenre.trim()) {
      setError("Please provide both a movie idea and genre.");
      return;
    }

    // ✅ Extra guard: if pro option is selected but user isn't subscribed, stop here
    if (selectedOption?.isPro && !isSubscribed) {
      if (!user) {
        setShowLoginModal(true);
        setError("Please log in to access Pro features.");
        return;
      }
      setError(`"${scriptLength}" requires Pro. Upgrade to generate this length.`);
      router.push("/upgrade");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingMessage("Generating your film package...");

    try {
      const token = user ? await user.getIdToken() : null;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          movieIdea,
          movieGenre,
          // ✅ Send VALUE to backend: "60 min" / "120 min"
          scriptLength,
          provider: "openai",
        }),
      });

      if (!res.ok) {
        const errorResponse = await res.json();
        throw new Error(errorResponse?.error || "Failed to generate film package.");
      }

      const data = await res.json();

      // Upload audio assets to Firebase Storage and map to SoundAsset
      const uploadedSoundAssets: SoundAsset[] = data.soundAssets?.length
        ? await Promise.all(
            data.soundAssets.map(async (asset: { buffer: ArrayBuffer; filename: string }) => {
              try {
                const audioUrl = await uploadAudioFile(asset.buffer, asset.filename);
                return {
                  name: asset.filename,
                  type: "music" as const,
                  duration: "0:00",
                  description: `Uploaded audio: ${asset.filename}`,
                  audioUrl,
                };
              } catch (uploadErr) {
                console.error(`Failed to upload ${asset.filename}:`, uploadErr);
                return null;
              }
            })
          ).then((assets) => assets.filter((asset): asset is SoundAsset => asset !== null))
        : [];

      updateFilmPackage({
        idea: movieIdea,
        genre: movieGenre,
        // ✅ Store VALUE in the package so Script tab regenerates correctly
        length: scriptLength,
        script: data.script || "",
        logline: data.logline || "",
        synopsis: data.synopsis || "",
        themes: data.themes || [],
        characters: data.characters || [],
        storyboard: data.storyboard || [],
        soundAssets: uploadedSoundAssets,
      });

      setLoadingMessage("Film package generated! Navigate to other tabs to explore your content.");
    } catch (err: any) {
      console.error("Generation error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  if (authLoading || subscriptionLoading) {
    return (
      <div className={cn("min-h-screen cinematic-gradient flex items-center justify-center")}>
        <Loader2 className={cn("w-8 h-8 text-[#FF6A00] animate-spin")} />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen cinematic-gradient relative overflow-hidden")}>
      {/* Background Film Icon */}
      <div className={cn("film-icon-bg")}>
        <Film size={500} className={cn("text-[#FF6A00]")} />
      </div>

      <div className={cn("relative z-10 container mx-auto px-4 py-12")}>
        <div className={cn("max-w-4xl mx-auto")}>
          {/* Header */}
          <div className={cn("text-center mb-12")}>
            <div className={cn("flex items-center justify-center space-x-3 mb-4")}>
              <Film className={cn("w-10 h-10 text-[#FF6A00]")} />
              <h1 className={cn("text-4xl font-bold text-white")}>Vizir Film Pro Suite</h1>
            </div>
            <p className={cn("text-xl text-[#B2C8C9] max-w-2xl mx-auto")}>
              Transform your ideas into complete film packages with Vizir Film Generator
            </p>
          </div>

          {/* Auth Buttons */}
          <div className={cn("flex justify-end mb-4 gap-2")}>
            {user && (
              <Button
                onClick={() => logout()}
                className={cn("bg-red-500 hover:bg-red-600 text-white px-4 py-2")}
              >
                Log Out
              </Button>
            )}
            <Button
              onClick={() => setShowLoginModal(true)}
              className={cn("bg-[#FF6A00] hover:bg-[#E55A00] text-white px-4 py-2")}
            >
              {user ? "Profile" : "Log In"}
            </Button>
          </div>

          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

          {/* Generation Form */}
          <Card className={cn("glass-effect border-[#FF6A00]/20 p-8 mb-8")}>
            <div className={cn("space-y-6 relative overflow-visible")}>
              {/* Movie Idea Input */}
              <div>
                <label className={cn("block text-white font-medium mb-2")}>Describe Your Film Idea</label>
                <Textarea
                  placeholder="A detective investigates mysterious disappearances in a small town..."
                  value={movieIdea}
                  onChange={(e) => setMovieIdea(e.target.value)}
                  className={cn(
                    "bg-[#032f30] border-[#FF6A00]/20 text-white placeholder:text-[#B2C8C9] focus:border-[#FF6A00] min-h-[100px]"
                  )}
                />
              </div>

              {/* Genre Selection */}
              <div>
                <label className={cn("block text-white font-medium mb-2")}>Genre</label>
                <div className={cn("space-y-2")}>
                  <Input
                    placeholder="Enter genre (e.g. Sci-Fi, Thriller)"
                    value={movieGenre}
                    onChange={(e) => setMovieGenre(e.target.value)}
                    className={cn(
                      "bg-[#032f30] border-[#FF6A00]/20 text-white placeholder:text-[#B2C8C9] focus:border-[#FF6A00]"
                    )}
                  />
                  <div className={cn("relative")}>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGenreDropdown(!showGenreDropdown);
                      }}
                      className={cn(
                        "w-full justify-between border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                      )}
                    >
                      Browse Genres
                      <ChevronDown className={cn("w-4 h-4")} />
                    </Button>

                    {showGenreDropdown &&
                      typeof document !== "undefined" &&
                      createPortal(
                        <div
                          className={cn(
                            "fixed left-1/2 top-[50%] w-[300px] -translate-x-1/2 z-[9999] bg-[#032f30] border border-[#FF6A00]/20 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-all duration-300"
                          )}
                        >
                          {genreList.map((genre) => (
                            <button
                              key={genre}
                              onClick={() => {
                                setMovieGenre(genre);
                                setShowGenreDropdown(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-2 text-white hover:bg-[#FF6A00] hover:text-white transition-colors"
                              )}
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
                <label className={cn("block text-white font-medium mb-2")}>Script Length</label>
                <div className={cn("relative")}>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLengthDropdown(!showLengthDropdown);
                    }}
                    className={cn(
                      "w-full justify-between border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                    )}
                  >
                    {scriptLengthLabel}
                    <ChevronDown className={cn("w-4 h-4")} />
                  </Button>

                  {/* ✅ Always show what will be submitted */}
                  <div className={cn("mt-2 text-sm text-[#B2C8C9]")}>
                    Selected length to generate:{" "}
                    <span className={cn("text-white font-semibold")}>{scriptLength}</span>
                    {selectedOption?.isPro && !isSubscribed ? (
                      <span className={cn("ml-2 text-yellow-300")}>
                        (Pro required — will redirect to upgrade)
                      </span>
                    ) : null}
                  </div>

                  {showLengthDropdown &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <div
                        className={cn(
                          "fixed left-1/2 top-[50%] w-[300px] -translate-x-1/2 z-[9999] bg-[#032f30] border border-[#FF6A00]/20 rounded-lg shadow-lg max-h-60 overflow-y-auto transition-all duration-300"
                        )}
                      >
                        {scriptLengthOptions.map((option) => (
                          <button
                            key={option.label}
                            onClick={() => {
                              if (option.isPro && !isSubscribed) {
                                handleProLengthClick(option);
                              } else {
                                // ✅ Set VALUE and clear any previous errors
                                setScriptLength(option.value);
                                setShowLengthDropdown(false);
                                setError(null);
                              }
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-white hover:bg-[#FF6A00] hover:text-white transition-colors flex items-center justify-between",
                              option.isPro && !isSubscribed && "opacity-60"
                            )}
                          >
                            <span>{option.label}</span>
                            {option.isPro && <Crown className={cn("w-4 h-4 text-yellow-400")} />}
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
                className={cn(
                  "w-full bg-[#FF6A00] hover:bg-[#E55A00] text-white py-4 text-lg font-semibold",
                  loading && "opacity-50"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className={cn("w-5 h-5 mr-2 animate-spin")} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className={cn("w-5 h-5 mr-2")} />
                    Generate Film Package
                  </>
                )}
              </Button>

              {error && (
                <div className={cn("text-red-400 text-center p-3 bg-red-400/10 rounded-lg")}>
                  {error}
                </div>
              )}

              {loading && loadingMessage && (
                <div className={cn("text-[#B2C8C9] text-center")}>{loadingMessage}</div>
              )}
            </div>
          </Card>

          {/* Pro Features CTA */}
          <Card className={cn("glass-effect border-yellow-400/20 p-6")}>
            <div className={cn("text-center")}>
              <Crown className={cn("w-8 h-8 text-yellow-400 mx-auto mb-3")} />
              <h3 className={cn("text-xl font-semibold text-white mb-2")}>Unlock Pro Features</h3>
              <p className={cn("text-[#B2C8C9] mb-4")}>
                Get longer scripts, advanced storyboards, detailed budgets, and more.
              </p>
              <Button
                className={cn("bg-yellow-400 hover:bg-yellow-500 text-black font-semibold")}
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
