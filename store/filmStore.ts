import { create } from 'zustand';

interface Shot {
  shot_type: string;
  description: string;
  lens_angle: string;
  movement: string;
  lighting_setup: string;
  image: string;
}

interface StoryboardScene {
  shots: Shot[];
}

interface FilmPackage {
  script: string;
  genre: string;
  storyboard?: StoryboardScene[];
}

interface FilmState {
  filmPackage: FilmPackage | null;
  updateStoryboard: (sceneIndex: number, storyboardData: StoryboardScene) => void;
}

export const useFilmStore = create<FilmState>((set) => ({
  filmPackage: null,

  updateStoryboard: (sceneIndex, storyboardData) =>
    set((state) => {
      const existingStoryboard = state.filmPackage?.storyboard || [];
      const updatedStoryboard = [...existingStoryboard];
      updatedStoryboard[sceneIndex] = storyboardData;

      return {
        filmPackage: {
          ...state.filmPackage!,
          storyboard: updatedStoryboard,
        },
      };
    }),
}));
