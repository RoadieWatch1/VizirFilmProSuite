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
  audioUrl?: string; // ✅ FIXED: Added the missing audioUrl property
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
}

interface FilmStore {
  filmPackage: FilmPackage | null;
  lowBudgetMode: boolean;
  updateFilmPackage: (updates: Partial<FilmPackage>) => void;
  replaceFilmPackage: (newPackage: FilmPackage) => void;
  clearFilmPackage: () => void;
  setLowBudgetMode: (value: boolean) => void;
}

export const useFilmStore = create<FilmStore>()(
  persist(
    (set, get) => ({
      filmPackage: null,
      lowBudgetMode: false,

      updateFilmPackage: (updates) => {
        const current = get().filmPackage ?? {};
        const newPackage = { ...current, ...updates };
        set({ filmPackage: newPackage });
      },

      replaceFilmPackage: (newPackage) => {
        set({ filmPackage: newPackage });
      },

      clearFilmPackage: () => {
        set({ filmPackage: null });
      },

      setLowBudgetMode: (value) => {
        set({ lowBudgetMode: value });
      },
    }),
    {
      name: "film-package-storage",
    }
  )
);