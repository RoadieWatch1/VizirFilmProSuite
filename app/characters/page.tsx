"use client";

import { useState } from "react";
import { Users, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilmStore } from "@/lib/store";

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
}

export default function CharactersPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  const handleAddCharacter = () => {
    if (!newCharacter.name.trim() || !newCharacter.description.trim()) {
      alert("Character name and description are required.");
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
      alert("Please generate a script first from the Create tab.");
      return;
    }

    setLoading(true);
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
        alert(errorData.error || "Failed to generate characters.");
        return;
      }

      const data = await res.json();
      let updatedCharacters = data.characters || [];

      // Automatically generate portraits for each character
      for (let index = 0; index < updatedCharacters.length; index++) {
        const character = updatedCharacters[index];
        if (!character.name || !character.description) continue;

        const portraitRes = await fetch("/api/characters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            step: "generate-portrait",
            character,
          }),
        });

        if (portraitRes.ok) {
          const portraitData = await portraitRes.json();
          updatedCharacters[index] = {
            ...character,
            imageUrl: portraitData.imageUrl,
            visualDescription: portraitData.visualDescription,
          };
        } else {
          console.error("Failed to generate portrait for character:", character.name);
        }
      }

      updateFilmPackage({ characters: updatedCharacters });
      alert("Characters and portraits generated successfully!");
    } catch (error) {
      console.error("Failed to generate characters:", error);
      alert("Failed to generate characters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePortrait = async (character: Character, index: number) => {
    if (!character.name || !character.description) {
      alert("Character name and description are required for generating a portrait.");
      return;
    }

    setLoading(true);
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
        alert(errorData.error || "Error generating portrait.");
        return;
      }

      const data = await res.json();

      const updatedCharacters = [...characters];
      updatedCharacters[index] = {
        ...character,
        imageUrl: data.imageUrl,
        visualDescription: data.visualDescription,
      };

      updateFilmPackage({ characters: updatedCharacters });
    } catch (error) {
      console.error("Failed to generate portrait:", error);
      alert("Error generating portrait. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderCharacterForm = () => (
    <Card className="glass-effect border-[#FF6A00]/20 p-8 text-left space-y-4 mt-6">
      <h3 className="text-xl font-semibold text-white mb-4">Add Character</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          className="p-2 rounded bg-[#032f30] text-white"
          placeholder="Name"
          value={newCharacter.name}
          onChange={(e) =>
            setNewCharacter({ ...newCharacter, name: e.target.value })
          }
        />
        <input
          className="p-2 rounded bg-[#032f30] text-white"
          placeholder="Role"
          value={newCharacter.role}
          onChange={(e) =>
            setNewCharacter({ ...newCharacter, role: e.target.value })
          }
        />
        <textarea
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
        <input
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
          <input
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
          <input
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
          <input
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
        <input
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
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Users className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                Character Development
              </h1>
              <p className="text-[#B2C8C9]">
                Create and manage your film's characters
              </p>
            </div>
            <div className="flex justify-center mb-8">
              <Button
                onClick={handleGenerateCharacters}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                {loading ? "Generating..." : "Generate Characters"}
              </Button>
            </div>
            {renderCharacterForm()}
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
              <h1 className="text-3xl font-bold text-white mb-2">
                Characters
              </h1>
              <p className="text-[#B2C8C9]">
                Character profiles and visual development
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateCharacters}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white mt-4 md:mt-0"
              >
                {loading ? "Generating..." : "Generate Characters"}
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

                {character.imageUrl && (
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-auto rounded border border-[#FF6A00]/30"
                  />
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
                    style={{ backgroundColor: character.skinColor }}
                  />
                  <span className="text-xs text-[#8da3a4]">Hair:</span>
                  <span
                    className="inline-block w-4 h-4 rounded"
                    style={{ backgroundColor: character.hairColor }}
                  />
                  <span className="text-xs text-[#8da3a4]">Clothes:</span>
                  <span
                    className="inline-block w-4 h-4 rounded"
                    style={{ backgroundColor: character.clothingColor }}
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
                  {loading ? "Generating..." : character.imageUrl ? "Regenerate Portrait" : "Generate Portrait"}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}