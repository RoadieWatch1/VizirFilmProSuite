// C:\Users\vizir\VizirPro\lib\store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StoryboardFrame, Character } from "@/lib/generators";

export interface BudgetItem {
  name: string;
  cost: number;
}

export interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  items?: (string | BudgetItem)[];
  tips?: string[];
  alternatives?: string[];
}

export interface ScheduleDay {
  day: string;
  activities: string[];
  duration: string;
  location?: string;
  crew?: string[];
}

export interface Location {
  name: string;
  type: string;
  description: string;
  mood?: string;
  colorPalette?: string;
  propsOrFeatures?: string[];
  scenes?: string[];
  rating?: number;
  accessibility?: string;
  safety?: string;
  budget?: BudgetCategory;
  lowBudgetAlternatives?: string[];
  highBudgetAlternatives?: string[];
  lowBudgetTips?: string;
  highBudgetOpportunities?: string;
}

export interface SoundAsset {
  name: string;
  type: "music" | "sfx" | "dialogue" | "ambient";
  duration: string;
  description: string;
  scenes?: string[];
  audioUrl?: string;
}

export interface FilmPackage {
  idea?: string;
  genre?: string;
  length?: string;
  script?: string;
  logline?: string;
  synopsis?: string;
  themes?: string[];
  concept?: string;
  characters?: Character[];
  shortScript?: StoryboardFrame[];
  storyboard?: StoryboardFrame[];
  budget?: BudgetCategory[];
  schedule?: ScheduleDay[];
  locations?: Location[];
  soundDesign?: string;
  soundAssets?: SoundAsset[];
  exportPackage?: string;
  estimatedRuntime?: string; // Added to store runtime
}

interface FilmStore {
  filmPackage: FilmPackage | null;
  lowBudgetMode: boolean;
  updateFilmPackage: (updates: Partial<FilmPackage>) => void;
  replaceFilmPackage: (newPackage: FilmPackage) => void;
  clearFilmPackage: () => void;
  setLowBudgetMode: (value: boolean) => void;
  validateAndUpdateRuntime: () => void; // Added to validate and update runtime
}

export const useFilmStore = create<FilmStore>()(
  persist(
    (set, get) => ({
      filmPackage: null,
      lowBudgetMode: false,

      updateFilmPackage: (updates) => {
        const current = get().filmPackage ?? {};
        const newPackage = { ...current, ...updates };

        // Log script and character stats
        if (updates.script) {
          const estPages = Math.round(updates.script.split("\n").length / 40);
          const sceneCount = (updates.script.match(/^(INT\.|EXT\.)/gm) || []).length;
          console.log("Updating filmPackage with script:", {
            scriptLength: updates.script.length,
            estPages,
            sceneCount,
            characterCount: updates.characters?.length || 0,
          });
        }

        // Validate script length against expected duration
        if (updates.length && updates.script) {
          const duration = parseInt(updates.length.replace(/\D/g, ""), 10) || 5;
          const estPages = Math.round(updates.script.split("\n").length / 40);
          if (estPages < duration * 0.8) {
            console.warn(
              `Script too short: ${estPages} pages for ${duration}-minute film. Expected ~${duration} pages.`
            );
          }
        }

        set({ filmPackage: newPackage });
      },

      replaceFilmPackage: (newPackage) => {
        // Log stats for full package replacement
        const estPages = newPackage.script ? Math.round(newPackage.script.split("\n").length / 40) : 0;
        const sceneCount = newPackage.script ? (newPackage.script.match(/^(INT\.|EXT\.)/gm) || []).length : 0;
        console.log("Replacing filmPackage:", {
          scriptLength: newPackage.script?.length || 0,
          estPages,
          sceneCount,
          characterCount: newPackage.characters?.length || 0,
        });

        set({ filmPackage: newPackage });
      },

      clearFilmPackage: () => {
        console.log("Clearing filmPackage");
        set({ filmPackage: null });
      },

      setLowBudgetMode: (value) => {
        console.log("Setting lowBudgetMode:", value);
        set({ lowBudgetMode: value });
      },

      validateAndUpdateRuntime: () => {
        const current = get().filmPackage;
        if (!current?.script || !current?.length) {
          console.warn("Cannot validate runtime: missing script or length");
          return;
        }

        const duration = parseInt(current.length.replace(/\D/g, ""), 10) || 5;
        const estPages = Math.round(current.script.split("\n").length / 40);
        const estimatedRuntime = `${estPages} min`; // 1 page ≈ 1 minute

        if (estPages < duration * 0.8) {
          console.warn(
            `Runtime mismatch: estimated ${estPages} min, expected ${duration} min`
          );
        }

        set({
          filmPackage: {
            ...current,
            estimatedRuntime,
          },
        });

        console.log("Updated runtime:", { estimatedRuntime, expected: duration });
      },
    }),
    {
      name: "film-package-storage",
    }
  )
);