// /store/filmStore.ts
import { create } from 'zustand';

/** --- TYPES --- **/

export interface Character {
  name: string;
  description: string;
}

export interface StoryboardScene {
  sceneNumber: number;
  description: string;
  imageUrl: string;
  shot_type?: string;
  lens_angle?: string;
  movement?: string;
  lighting_setup?: string;
}

export interface Location {
  name: string;
  description: string;
}

export interface ScheduleItem {
  day: number;
  scenes: number[];
  location: string;
}

export interface BudgetItem {
  name: string;
  cost: number;
}

export interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  items: (string | BudgetItem)[];
}

/** --- SOUND PLAN --- **/

export interface SoundPlan {
  overallStyle: string;
  musicGenres: string[];
  keyEffects: string[];
  notableMoments: Array<{
    scene: string;
    soundDesign: string;
  }>;
}

/** --- FILM PACKAGE --- **/

export interface FilmPackage {
  script?: string;
  concept?: string;
  synopsis?: string;
  logline?: string;
  themes?: string[];
  scenes?: string;
  characters?: Character[];
  storyboard?: StoryboardScene[];
  locations?: Location[];
  schedule?: ScheduleItem[];
  /**
   * Budget can be either:
   * - a string (text block generated from AI)
   * - OR an array of structured budget categories
   */
  budget?: string | BudgetCategory[];
  /**
   * Sound Design can be either:
   * - a string (single block of text)
   * - OR a structured SoundPlan object
   */
  soundDesign?: string | SoundPlan;
  genre?: string;
  length?: string;
  idea?: string;

  /**
   * NEW: Export Package returned from /api/export
   */
  exportPackage?: {
    projectTitle: string;
    logline: string;
    synopsis: string;
    keyCharacters: string[];
    budgetSummary: string;
    locations: string[];
    soundSummary: string;
    pitchDeckText: string;
  };
}

export const initialFilmPackage: FilmPackage = {
  script: '',
  concept: '',
  synopsis: '',
  logline: '',
  themes: [],
  scenes: '',
  characters: [],
  storyboard: [],
  locations: [],
  schedule: [],
  budget: '',
  soundDesign: '',
  genre: '',
  length: '',
  idea: '',
  exportPackage: undefined,
};

/** --- ZUSTAND STORE --- **/

interface FilmStore {
  filmPackage: FilmPackage;
  updateFilmPackage: (data: Partial<FilmPackage>) => void;
  resetFilmPackage: () => void;
}

export const useFilmStore = create<FilmStore>((set) => ({
  filmPackage: initialFilmPackage,
  updateFilmPackage: (data) =>
    set((state) => ({
      filmPackage: { ...state.filmPackage, ...data },
    })),
  resetFilmPackage: () => set({ filmPackage: initialFilmPackage }),
}));
