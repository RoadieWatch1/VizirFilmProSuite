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

// Matches SCRIPT_WORDS_PER_PAGE in lib/generators.ts
const WORDS_PER_PAGE = 180;

function countWordsForEstimate(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function estimatePages(script: string): number {
  const words = countWordsForEstimate(script);
  return Math.max(1, Math.round(words / WORDS_PER_PAGE));
}

export const useFilmStore = create<FilmStore>()(
  persist(
    (set, get) => ({
      filmPackage: null,
      lowBudgetMode: false,

      updateFilmPackage: (updates) => {
        const current = get().filmPackage ?? {};
        const newPackage = { ...current, ...updates };

        if (updates.script) {
          const estPages = estimatePages(updates.script);
          const sceneCount = (updates.script.match(/^(INT\.|EXT\.)/gm) || []).length;
          console.log("Updating filmPackage with script:", {
            words: countWordsForEstimate(updates.script),
            estPages,
            sceneCount,
            characterCount: updates.characters?.length || 0,
          });
        }

        if (updates.length && updates.script) {
          const duration = parseInt(updates.length.replace(/\D/g, ""), 10) || 5;
          const estPages = estimatePages(updates.script);
          if (estPages < duration * 0.8) {
            console.warn(
              `Script too short: ${estPages} pages for ${duration}-minute film. Expected ~${duration} pages.`
            );
          }
        }

        set({ filmPackage: newPackage });
      },

      replaceFilmPackage: (newPackage) => {
        const estPages = newPackage.script ? estimatePages(newPackage.script) : 0;
        const sceneCount = newPackage.script ? (newPackage.script.match(/^(INT\.|EXT\.)/gm) || []).length : 0;
        console.log("Replacing filmPackage:", {
          words: newPackage.script ? countWordsForEstimate(newPackage.script) : 0,
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
        const estPages = estimatePages(current.script);
        const estimatedRuntime = `${estPages} min`;

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