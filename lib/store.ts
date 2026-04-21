// C:\Users\vizir\VizirPro\lib\store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StoryboardFrame, Character, ScriptCoverage, ShotList, DirectorStatement, SocialPackage, DistributionStrategy, VisionBoard } from "@/lib/generators";
import {
  ProjectSummary,
  createProject as repoCreateProject,
  deleteProject as repoDeleteProject,
  listProjects as repoListProjects,
  loadProject as repoLoadProject,
  saveProject as repoSaveProject,
  renameProject as repoRenameProject,
} from "@/lib/projectsRepo";

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
  estimatedRuntime?: string;
  coverage?: ScriptCoverage;
  shotList?: ShotList;
  directorStatement?: DirectorStatement;
  socialPackage?: SocialPackage;
  distribution?: DistributionStrategy;
  visionBoard?: VisionBoard;
}

interface FilmStore {
  // Active project state
  filmPackage: FilmPackage | null;
  lowBudgetMode: boolean;

  // Multi-project state
  projects: ProjectSummary[];
  activeProjectId: string | null;
  projectsLoading: boolean;
  saving: boolean;
  lastSavedAt: number | null;

  // Film package actions
  updateFilmPackage: (updates: Partial<FilmPackage>) => void;
  replaceFilmPackage: (newPackage: FilmPackage) => void;
  clearFilmPackage: () => void;
  setLowBudgetMode: (value: boolean) => void;
  validateAndUpdateRuntime: () => void;

  // Project actions
  setActiveProjectId: (id: string | null) => void;
  refreshProjects: (uid: string) => Promise<void>;
  createProject: (uid: string, title?: string) => Promise<string>;
  openProject: (uid: string, projectId: string) => Promise<void>;
  saveActiveProject: (uid: string) => Promise<void>;
  renameProject: (uid: string, projectId: string, title: string) => Promise<void>;
  deleteProject: (uid: string, projectId: string) => Promise<void>;
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

// ─────────────────────────────────────────────────────────────
// Debounced auto-save pipeline
// When filmPackage changes and we have a uid + activeProjectId,
// the store queues a save. Pending saves coalesce to reduce writes.
// ─────────────────────────────────────────────────────────────
const AUTOSAVE_DELAY_MS = 1500;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let autosaveUid: string | null = null;

export function configureAutosave(uid: string | null) {
  autosaveUid = uid;
}

function hasMeaningfulContent(pkg: FilmPackage | null | undefined): boolean {
  if (!pkg) return false;
  const keys = Object.keys(pkg);
  if (keys.length === 0) return false;
  // Require at least one substantive field, not just an empty shell.
  if (pkg.idea && pkg.idea.trim()) return true;
  if (pkg.script && pkg.script.trim()) return true;
  if (pkg.logline && pkg.logline.trim()) return true;
  if (pkg.synopsis && pkg.synopsis.trim()) return true;
  if (pkg.characters && pkg.characters.length > 0) return true;
  if (pkg.storyboard && pkg.storyboard.length > 0) return true;
  if (pkg.budget && pkg.budget.length > 0) return true;
  return false;
}

function scheduleAutosave() {
  if (!autosaveUid) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    autosaveTimer = null;
    const uid = autosaveUid;
    if (!uid) return;
    const store = useFilmStore.getState();
    const pkg = store.filmPackage;
    if (!hasMeaningfulContent(pkg)) return;
    try {
      useFilmStore.setState({ saving: true });
      let pid = store.activeProjectId;
      if (!pid) {
        // Auto-create a project on first meaningful change
        pid = await repoCreateProject(uid, { pkg: pkg! });
        useFilmStore.setState({ activeProjectId: pid });
      } else {
        await repoSaveProject(uid, pid, pkg!);
      }
      useFilmStore.setState({ saving: false, lastSavedAt: Date.now() });
      // Refresh the project list so thumbnails/titles stay current
      try {
        const items = await repoListProjects(uid);
        useFilmStore.setState({ projects: items });
      } catch {}
    } catch (err) {
      useFilmStore.setState({ saving: false });
      console.error("Autosave failed:", err);
    }
  }, AUTOSAVE_DELAY_MS);
}

export const useFilmStore = create<FilmStore>()(
  persist(
    (set, get) => ({
      filmPackage: null,
      lowBudgetMode: false,

      projects: [],
      activeProjectId: null,
      projectsLoading: false,
      saving: false,
      lastSavedAt: null,

      updateFilmPackage: (updates) => {
        const current = get().filmPackage ?? {};
        const newPackage = { ...current, ...updates };
        set({ filmPackage: newPackage });
        scheduleAutosave();
      },

      replaceFilmPackage: (newPackage) => {
        set({ filmPackage: newPackage });
        scheduleAutosave();
      },

      clearFilmPackage: () => {
        set({ filmPackage: null });
      },

      setLowBudgetMode: (value) => {
        set({ lowBudgetMode: value });
      },

      validateAndUpdateRuntime: () => {
        const current = get().filmPackage;
        if (!current?.script || !current?.length) return;

        const duration = parseInt(current.length.replace(/\D/g, ""), 10) || 5;
        const estPages = estimatePages(current.script);
        const estimatedRuntime = `${estPages} min`;

        if (estPages < duration * 0.8) {
          console.warn(
            `Runtime mismatch: estimated ${estPages} min, expected ${duration} min`,
          );
        }

        set({
          filmPackage: {
            ...current,
            estimatedRuntime,
          },
        });
      },

      setActiveProjectId: (id) => {
        set({ activeProjectId: id });
      },

      refreshProjects: async (uid) => {
        if (!uid) {
          set({ projects: [], projectsLoading: false });
          return;
        }
        set({ projectsLoading: true });
        try {
          const items = await repoListProjects(uid);
          set({ projects: items, projectsLoading: false });
        } catch (err) {
          console.error("refreshProjects failed:", err);
          set({ projectsLoading: false });
        }
      },

      createProject: async (uid, title) => {
        if (!uid) throw new Error("Must be signed in to create a project");
        const pkg = get().filmPackage || {};
        const pid = await repoCreateProject(uid, {
          title,
          // Start new projects EMPTY — don't copy the current package into it.
          pkg: title ? {} : pkg,
        });
        await get().refreshProjects(uid);
        // Activate & load fresh
        if (title) {
          set({ activeProjectId: pid, filmPackage: {} });
        } else {
          set({ activeProjectId: pid });
        }
        return pid;
      },

      openProject: async (uid, projectId) => {
        if (!uid) throw new Error("Must be signed in to open a project");
        if (autosaveTimer) {
          clearTimeout(autosaveTimer);
          autosaveTimer = null;
        }
        const doc = await repoLoadProject(uid, projectId);
        if (!doc) {
          set({ activeProjectId: null, filmPackage: null });
          throw new Error("Project not found");
        }
        set({
          activeProjectId: projectId,
          filmPackage: doc.package || {},
        });
      },

      saveActiveProject: async (uid) => {
        const pid = get().activeProjectId;
        const pkg = get().filmPackage;
        if (!uid || !pid || !pkg) return;
        set({ saving: true });
        try {
          await repoSaveProject(uid, pid, pkg);
          set({ saving: false, lastSavedAt: Date.now() });
          await get().refreshProjects(uid);
        } catch (err) {
          set({ saving: false });
          throw err;
        }
      },

      renameProject: async (uid, projectId, title) => {
        await repoRenameProject(uid, projectId, title);
        await get().refreshProjects(uid);
      },

      deleteProject: async (uid, projectId) => {
        await repoDeleteProject(uid, projectId);
        const active = get().activeProjectId;
        if (active === projectId) {
          set({ activeProjectId: null, filmPackage: null });
        }
        await get().refreshProjects(uid);
      },
    }),
    {
      name: "film-package-storage",
      // Persist only client-side preferences; the authoritative data lives in Firestore.
      partialize: (state) => ({
        filmPackage: state.filmPackage,
        lowBudgetMode: state.lowBudgetMode,
        activeProjectId: state.activeProjectId,
      }),
    },
  ),
);
