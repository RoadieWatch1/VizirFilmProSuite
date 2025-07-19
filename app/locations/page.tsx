"use client";

import { useState } from "react";
import { MapPin, Plus, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilmStore } from "@/lib/store";

export default function LocationsPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [loading, setLoading] = useState(false);

  const handleGenerateLocations = async () => {
    if (!filmPackage?.script || !filmPackage?.genre) {
      alert("Please generate a script first from the Create tab.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/locations", {
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
        const errorData = await res.json();
        console.error(errorData);
        alert("Failed to generate locations.");
        return;
      }

      const data = await res.json();
      console.log("Locations API result:", data);

      updateFilmPackage({
        locations: data.locations || [],
      });

      alert("Locations generated successfully!");
    } catch (error) {
      console.error("Failed to generate locations:", error);
      alert("An error occurred while generating locations.");
    } finally {
      setLoading(false);
    }
  };

  const locations = filmPackage?.locations || [];

  if (locations.length === 0) {
    return (
      <div className="min-h-screen cinematic-gradient">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <MapPin className="w-16 h-16 text-[#FF6A00] mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">
                Location Management
              </h1>
              <p className="text-[#B2C8C9]">
                Scout and manage filming locations
              </p>
            </div>

            <Card className="glass-effect border-[#FF6A00]/20 p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">
                No Locations Yet
              </h3>
              <p className="text-[#B2C8C9] mb-6">
                Generate professional location suggestions based on your script
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerateLocations}
                  disabled={loading}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Locations"
                  )}
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Locations
            </h1>
            <p className="text-[#B2C8C9]">
              Filming location design and visual references for your production
            </p>
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {locations.map((location, index) => (
              <Card
                key={index}
                className="glass-effect border-[#FF6A00]/20 hover-lift"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white">
                    {location.name || "Unnamed Location"}
                  </h3>
                  <Badge className="mt-1 bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30">
                    {location.type || "Unknown Type"}
                  </Badge>

                  <p className="text-[#B2C8C9] text-sm mt-4 mb-4 leading-relaxed">
                    {location.description || "No description available."}
                  </p>

                  <div className="mb-3">
                    <p className="text-sm text-[#8da3a4] mb-1">
                      Mood:
                    </p>
                    <p className="text-[#B2C8C9] text-sm">
                      {location.mood || "N/A"}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-[#8da3a4] mb-1 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#FF6A00]" />
                      Color Palette:
                    </p>
                    <p className="text-[#B2C8C9] text-sm">
                      {location.colorPalette || "N/A"}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-[#8da3a4] mb-1">
                      Props / Features:
                    </p>
                    {location.propsOrFeatures && location.propsOrFeatures.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {location.propsOrFeatures.map((prop: string, i: number) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs bg-[#032f30] text-[#B2C8C9]"
                          >
                            {prop}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#B2C8C9] text-sm">N/A</p>
                    )}
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-[#8da3a4] mb-1">
                      Low Budget Tips:
                    </p>
                    <p className="text-[#B2C8C9] text-sm">
                      {location.lowBudgetTips || "N/A"}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-[#8da3a4] mb-1">
                      High Budget Opportunities:
                    </p>
                    <p className="text-[#B2C8C9] text-sm">
                      {location.highBudgetOpportunities || "N/A"}
                    </p>
                  </div>

                  <div className="mb-2">
                    <p className="text-sm text-[#8da3a4] mb-1">
                      Scene Ideas:
                    </p>
                    {location.scenes && location.scenes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {location.scenes.map((scene: string, i: number) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs bg-[#032f30] text-[#B2C8C9]"
                          >
                            {scene}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#B2C8C9] text-sm">N/A</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
