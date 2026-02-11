"use client";

import { useEffect, useState } from "react";
import {
  Lightbulb,
  Plus,
  Image as LucideImage,
  Palette,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFilmStore } from "@/lib/store";

type ConceptData = {
  visualStyle?: string;
  colorPalette?: string;
  cameraTechniques?: string;
  lightingApproach?: string;
  thematicSymbolism?: string;
  productionValues?: string;
};

type VisualReference = {
  description: string;
  imageUrl?: string;
};

export default function ConceptPage() {
  const { filmPackage } = useFilmStore();
  const [concept, setConcept] = useState<ConceptData | null>(null);
  const [visualReferences, setVisualReferences] = useState<VisualReference[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load concept from local storage
  useEffect(() => {
    const storedConcept = localStorage.getItem("vizirConceptData");
    const storedRefs = localStorage.getItem("vizirConceptRefs");

    if (storedConcept) {
      setConcept(JSON.parse(storedConcept));
    }

    if (storedRefs) {
      setVisualReferences(JSON.parse(storedRefs));
    }
  }, []);

  // Persist concept to local storage
  useEffect(() => {
    if (concept) {
      localStorage.setItem("vizirConceptData", JSON.stringify(concept));
    }
  }, [concept]);

  useEffect(() => {
    if (visualReferences) {
      localStorage.setItem(
        "vizirConceptRefs",
        JSON.stringify(visualReferences)
      );
    }
  }, [visualReferences]);

  const handleGenerateConcept = async () => {
    if (!filmPackage?.script || !filmPackage?.genre) {
      alert("Please generate a script first from the Create tab.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "concept",
          scriptContent: filmPackage.script,
          movieGenre: filmPackage.genre,
          scriptLength: filmPackage.length || "10 min",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to generate concept.");
      }

      const data = await res.json();
      console.log("Concept result:", data);

      const conceptData: ConceptData = {
        visualStyle: data.concept?.visualStyle || "",
        colorPalette: data.concept?.colorPalette || "",
        cameraTechniques: data.concept?.cameraTechniques || "",
        lightingApproach: data.concept?.lightingApproach || "",
        thematicSymbolism: data.concept?.thematicSymbolism || "",
        productionValues: data.concept?.productionValues || "",
      };

      setConcept(conceptData);
      setVisualReferences(data.visualReferences || []);
    } catch (err: any) {
      console.error("Failed to generate concept:", err);
      setError(err?.message || "An error occurred while generating the concept.");
    } finally {
      setLoading(false);
    }
  };

  const hasConcept = concept && Object.keys(concept).length > 0;

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Film Concept
              </h1>
              <p className="text-[#B2C8C9]">
                Visual and thematic development
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Button
                variant="outline"
                size="sm"
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                <LucideImage className="w-4 h-4 mr-2" />
                Add Images
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                <Palette className="w-4 h-4 mr-2" />
                Color Palette
              </Button>
              <Button
                onClick={handleGenerateConcept}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  hasConcept ? "Regenerate Concept" : "Generate Concept"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-center p-3 bg-red-400/10 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Concept Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="glass-effect border-[#FF6A00]/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Concept Overview
                </h3>

                {hasConcept ? (
                  <div className="space-y-3 text-[#B2C8C9] text-sm">
                    {concept.visualStyle && (
                      <p>
                        <strong>Visual Style:</strong> {concept.visualStyle}
                      </p>
                    )}
                    {concept.colorPalette && (
                      <p>
                        <strong>Color Palette:</strong> {concept.colorPalette}
                      </p>
                    )}
                    {concept.cameraTechniques && (
                      <p>
                        <strong>Camera Techniques:</strong>{" "}
                        {concept.cameraTechniques}
                      </p>
                    )}
                    {concept.lightingApproach && (
                      <p>
                        <strong>Lighting Approach:</strong>{" "}
                        {concept.lightingApproach}
                      </p>
                    )}
                    {concept.thematicSymbolism && (
                      <p>
                        <strong>Thematic Symbolism:</strong>{" "}
                        {concept.thematicSymbolism}
                      </p>
                    )}
                    {concept.productionValues && (
                      <p>
                        <strong>Production Values:</strong>{" "}
                        {concept.productionValues}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[#8da3a4] text-sm">
                    No concept generated yet.
                  </p>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              {/* Visual References */}
              <Card className="glass-effect border-[#FF6A00]/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Visual References
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {visualReferences.length > 0 ? (
                    visualReferences.map((ref, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg overflow-hidden"
                      >
                        {ref.imageUrl ? (
                          <img
                            src={ref.imageUrl}
                            alt={ref.description}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#032f30] flex items-center justify-center">
                            <LucideImage className="w-8 h-8 text-[#8da3a4]" />
                          </div>
                        )}
                        <p className="mt-2 text-[#B2C8C9] text-xs">
                          {ref.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#8da3a4] text-sm">
                      No visual references generated yet.
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reference
                </Button>
              </Card>

              {/* Color Palette */}
              <Card className="glass-effect border-[#FF6A00]/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Color Palette
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {["#021e1f", "#FF6A00", "#B2C8C9", "#032f30"].map(
                    (color, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg"
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Edit Palette
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
