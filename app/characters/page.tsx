"use client";

import { useState, useEffect } from "react";
import { Users, Plus, User, Loader2, Download, Star, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/EmptyState";
import { useFilmStore } from "@/lib/store";
import type { CharacterCasting, CastingSuggestion } from "@/lib/generators";

interface Character {
  name: string;
  description: string;
  role?: string;
  traits?: string[];
  skinColor?: string;
  hairColor?: string;
  clothingColor?: string;
  mood?: string;
  visualDescription?: string;
  imageUrl?: string;
  casting?: CharacterCasting;
}

const TIER_META: Array<{
  key: keyof Pick<CharacterCasting, "aList" | "midTier" | "emerging" | "characterActors">;
  label: string;
  tag: string;
  accent: string;
  ring: string;
  bg: string;
}> = [
  {
    key: "aList",
    label: "A-List",
    tag: "Aspirational",
    accent: "text-[#FF6A00]",
    ring: "border-[#FF6A00]/35",
    bg: "bg-[#FF6A00]/10",
  },
  {
    key: "midTier",
    label: "Mid-Tier",
    tag: "Realistic",
    accent: "text-[#7AE2CF]",
    ring: "border-[#7AE2CF]/35",
    bg: "bg-[#7AE2CF]/10",
  },
  {
    key: "emerging",
    label: "Emerging",
    tag: "Indie-friendly",
    accent: "text-[#E8ECF0]",
    ring: "border-[rgba(255,255,255,0.15)]",
    bg: "bg-[rgba(255,255,255,0.04)]",
  },
  {
    key: "characterActors",
    label: "Character Actors",
    tag: "Scene-stealers",
    accent: "text-[#D4DEE0]",
    ring: "border-[rgba(255,255,255,0.12)]",
    bg: "bg-[rgba(255,255,255,0.03)]",
  },
];

function SuggestionRow({ s }: { s: CastingSuggestion }) {
  return (
    <div className="p-3 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-[#E8ECF0] leading-tight">{s.name}</div>
        {s.notableWork && (
          <div className="text-[11px] text-[#7AE2CF]/90 italic shrink-0">{s.notableWork}</div>
        )}
      </div>
      {s.reason && (
        <div className="text-xs text-[#B2C8C9] leading-snug">{s.reason}</div>
      )}
    </div>
  );
}

function CastingAccordion({ casting }: { casting: CharacterCasting }) {
  const [openTier, setOpenTier] = useState<string | null>("aList");
  return (
    <div className="space-y-2">
      {casting.notes && (
        <p className="text-xs text-[#A8BFC1] leading-snug italic border-l-2 border-[#FF6A00]/40 pl-3">
          {casting.notes}
        </p>
      )}
      {TIER_META.map(({ key, label, tag, accent, ring, bg }) => {
        const items = (casting[key] || []) as CastingSuggestion[];
        if (!items.length) return null;
        const isOpen = openTier === key;
        return (
          <div key={key} className={`rounded-lg border ${ring} ${bg}`}>
            <button
              type="button"
              onClick={() => setOpenTier(isOpen ? null : key)}
              className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
              <div className="flex items-center gap-2">
                <Star className={`w-3.5 h-3.5 ${accent}`} />
                <span className={`text-sm font-semibold ${accent}`}>{label}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#6E8B8D]">{tag}</span>
                <span className="text-[11px] text-[#6E8B8D]">· {items.length}</span>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-[#6E8B8D]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#6E8B8D]" />
              )}
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-2">
                {items.map((s, i) => <SuggestionRow key={i} s={s} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CharactersPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [castingLoadingIndex, setCastingLoadingIndex] = useState<number | null>(null);

  const [newCharacter, setNewCharacter] = useState<Character>({
    name: "",
    description: "",
    role: "",
    traits: [],
    skinColor: "#8C5D3C",
    hairColor: "#1C1C1C",
    clothingColor: "#A33C2F",
    mood: "",
  });

  const characters = filmPackage?.characters || [];

  // Debug: Log characters on change
  useEffect(() => {
    console.log("Current characters:", characters);
  }, [characters]);

  const handleAddCharacter = () => {
    if (!newCharacter.name.trim() || !newCharacter.description.trim()) {
      toast.error("Character name and description are required.");
      return;
    }

    const updated = [...characters, newCharacter];
    updateFilmPackage({ characters: updated });
    setNewCharacter({
      name: "",
      description: "",
      role: "",
      traits: [],
      skinColor: "#8C5D3C",
      hairColor: "#1C1C1C",
      clothingColor: "#A33C2F",
      mood: "",
    });
    setShowForm(false);
  };

  const handleGenerateCharacters = async () => {
    if (!filmPackage?.script || !filmPackage?.genre) {
      toast.error("Please generate a script first from the Create tab.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "generate-characters",
          scriptContent: filmPackage.script || "",
          genre: filmPackage.genre || "",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API error:", errorData.error);
        setError(errorData.error || "Failed to generate characters.");
        return;
      }

      const data = await res.json();
      console.log("Received characters from API:", data.characters);
      updateFilmPackage({ characters: data.characters || [] });
      toast.success("Characters generated successfully");
    } catch (error) {
      console.error("Failed to generate characters:", error);
      setError("Failed to generate characters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePortrait = async (character: Character, index: number) => {
    if (!character.name || !character.description) {
      toast.error("Character name and description are required for generating a portrait.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "generate-portrait",
          character,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API error:", errorData.error);
        setError(errorData.error || "Error generating portrait.");
        return;
      }

      const data = await res.json();
      console.log("Portrait generated for", character.name, ":", data.imageUrl);

      const updatedCharacters = [...characters];
      updatedCharacters[index] = {
        ...character,
        imageUrl: data.imageUrl,
        visualDescription: data.visualDescription,
      };

      updateFilmPackage({ characters: updatedCharacters });
    } catch (error) {
      console.error("Failed to generate portrait:", error);
      setError("Error generating portrait. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCasting = async (character: Character, index: number) => {
    if (!character.name || !character.description) {
      toast.error("Character name and description are required.");
      return;
    }
    setCastingLoadingIndex(index);
    setError(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "generate-casting",
          character,
          genre: filmPackage?.genre || "",
          title: filmPackage?.idea || "",
          logline: filmPackage?.logline || "",
          synopsis: filmPackage?.synopsis || "",
          themes: filmPackage?.themes || [],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Failed to generate casting suggestions.");
        toast.error(errorData.error || "Failed to generate casting suggestions.");
        return;
      }

      const data = await res.json();
      const casting = data?.casting as CharacterCasting | undefined;
      if (!casting) {
        toast.error("Casting generation returned no data.");
        return;
      }
      const updated = [...characters];
      updated[index] = {
        ...character,
        casting: { ...casting, generatedAt: Date.now() },
      };
      updateFilmPackage({ characters: updated });
      toast.success(`Casting suggestions ready for ${character.name}`);
    } catch (err: any) {
      console.error("Casting generation failed:", err);
      setError("Failed to generate casting. Please try again.");
    } finally {
      setCastingLoadingIndex(null);
    }
  };

  const handleDownloadCharacters = async () => {
    if (characters.length === 0) {
      toast.error("No characters to download.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/download-characters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ characters }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to download characters.");
      }

      // Create blob and download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `characters_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Character package downloaded successfully");
    } catch (error: any) {
      console.error("Failed to download characters:", error);
      setError("Failed to download character package. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderCharacterForm = () => (
    <Card className="glass-effect border-[#FF6A00]/20 p-8 text-left space-y-4 mt-6">
      <h3 className="text-xl font-semibold text-white mb-4">Add Character</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          className="p-2 rounded bg-[#032f30] text-white"
          placeholder="Name"
          value={newCharacter.name}
          onChange={(e) =>
            setNewCharacter({ ...newCharacter, name: e.target.value })
          }
        />
        <Input
          className="p-2 rounded bg-[#032f30] text-white"
          placeholder="Role"
          value={newCharacter.role}
          onChange={(e) =>
            setNewCharacter({ ...newCharacter, role: e.target.value })
          }
        />
        <Textarea
          className="p-2 rounded bg-[#032f30] text-white col-span-2"
          placeholder="Description"
          value={newCharacter.description}
          onChange={(e) =>
            setNewCharacter({
              ...newCharacter,
              description: e.target.value,
            })
          }
        />
        <Input
          className="p-2 rounded bg-[#032f30] text-white col-span-2"
          placeholder="Traits (comma separated)"
          value={newCharacter.traits?.join(", ") || ""}
          onChange={(e) =>
            setNewCharacter({
              ...newCharacter,
              traits: e.target.value.split(",").map((t) => t.trim()),
            })
          }
        />
        <div className="flex flex-col">
          <label className="text-sm text-[#B2C8C9]">Skin Color</label>
          <Input
            type="color"
            value={newCharacter.skinColor}
            onChange={(e) =>
              setNewCharacter({
                ...newCharacter,
                skinColor: e.target.value,
              })
            }
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-[#B2C8C9]">Hair Color</label>
          <Input
            type="color"
            value={newCharacter.hairColor}
            onChange={(e) =>
              setNewCharacter({
                ...newCharacter,
                hairColor: e.target.value,
              })
            }
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-[#B2C8C9]">Clothing Color</label>
          <Input
            type="color"
            value={newCharacter.clothingColor}
            onChange={(e) =>
              setNewCharacter({
                ...newCharacter,
                clothingColor: e.target.value,
              })
            }
          />
        </div>
        <Input
          className="p-2 rounded bg-[#032f30] text-white"
          placeholder="Mood (e.g. serious, playful)"
          value={newCharacter.mood}
          onChange={(e) =>
            setNewCharacter({
              ...newCharacter,
              mood: e.target.value,
            })
          }
        />
      </div>
      <Button
        onClick={handleAddCharacter}
        className="mt-4 bg-[#FF6A00] hover:bg-[#E55A00] text-white"
      >
        Save Character
      </Button>
    </Card>
  );

  if (characters.length === 0) {
    const hasScript = !!filmPackage?.script;
    return (
      <>
        <EmptyState
          icon={Users}
          title="Character Development"
          subtitle="Build rich, visually distinct characters for your film"
          emptyTitle="No characters yet"
          emptyDescription="Generate character profiles from your script — each with a role, traits, visual description, color palette, and AI portrait."
          needsPrerequisite={!hasScript}
          prerequisiteMessage="Generate a script first so characters can be extracted and profiled from your story."
          actionLabel="Generate Characters"
          actionLoadingLabel="Profiling characters..."
          onAction={handleGenerateCharacters}
          loading={loading}
        />
        {hasScript && (
          <div className="container mx-auto px-4 pb-12 max-w-4xl">
            {renderCharacterForm()}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Characters
              </h1>
              <p className="text-[#B2C8C9]">
                Character profiles and visual development
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleGenerateCharacters}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white mt-4 md:mt-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Characters"
                )}
              </Button>
              <Button
                onClick={handleDownloadCharacters}
                disabled={loading || characters.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white mt-4 md:mt-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Package
              </Button>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white mt-4 md:mt-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                {showForm ? "Cancel" : "Add Character"}
              </Button>
            </div>
          </div>

          {showForm && renderCharacterForm()}
          {error && (
            <div className="text-red-400 text-center p-3 bg-red-400/10 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {characters.map((character, index) => (
              <Card
                key={index}
                className="glass-effect border-[#FF6A00]/20 p-6 hover-lift space-y-3"
              >
                <div className="flex items-center space-x-4 mb-2">
                  <div className="w-12 h-12 bg-[#FF6A00] rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {character.name}
                    </h3>
                    {character.role && (
                      <Badge className="mt-1 bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30">
                        {character.role}
                      </Badge>
                    )}
                  </div>
                </div>

                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-auto rounded border border-[#FF6A00]/30"
                  />
                ) : (
                  <div className="w-full h-64 bg-[#032f30] rounded border border-[#FF6A00]/30 flex items-center justify-center text-[#B2C8C9]">
                    No Image Available
                  </div>
                )}

                <p className="text-[#B2C8C9] text-sm leading-relaxed">
                  {character.description}
                </p>

                {character.traits && character.traits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {character.traits.map((trait, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-[#032f30] text-[#B2C8C9]"
                      >
                        {trait}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-[#8da3a4]">Skin:</span>
                  <span
                    className="inline-block w-4 h-4 rounded"
                    style={{ backgroundColor: character.skinColor || "#8C5D3C" }}
                  />
                  <span className="text-xs text-[#8da3a4]">Hair:</span>
                  <span
                    className="inline-block w-4 h-4 rounded"
                    style={{ backgroundColor: character.hairColor || "#1C1C1C" }}
                  />
                  <span className="text-xs text-[#8da3a4]">Clothes:</span>
                  <span
                    className="inline-block w-4 h-4 rounded"
                    style={{ backgroundColor: character.clothingColor || "#A33C2F" }}
                  />
                </div>

                {character.visualDescription && (
                  <p className="text-xs text-[#8da3a4] mt-2">
                    <strong>Visual Description:</strong>{" "}
                    {character.visualDescription}
                  </p>
                )}

                <Button
                  onClick={() => handleGeneratePortrait(character, index)}
                  disabled={loading}
                  className="mt-3 bg-[#FF6A00] hover:bg-[#E55A00] text-white w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : character.imageUrl ? (
                    "Regenerate Portrait"
                  ) : (
                    "Generate Portrait"
                  )}
                </Button>

                <Button
                  onClick={() => handleGenerateCasting(character, index)}
                  disabled={castingLoadingIndex !== null}
                  variant="outline"
                  className="bg-transparent border-[#FF6A00]/30 text-[#FF6A00] hover:bg-[#FF6A00]/10 hover:text-[#FF6A00] w-full"
                >
                  {castingLoadingIndex === index ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Casting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {character.casting ? "Regenerate Casting" : "Generate Casting"}
                    </>
                  )}
                </Button>

                {character.casting && (
                  <div className="pt-2 mt-1 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="text-[11px] uppercase tracking-wider text-[#6E8B8D] mb-2">
                      Casting Suggestions
                    </div>
                    <CastingAccordion casting={character.casting} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}