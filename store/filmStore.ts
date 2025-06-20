import { create } from 'zustand';

interface FilmState {
  shots: any[];
  setShots: (shots: any[]) => void;
}

export const useFilmStore = create<FilmState>((set) => ({
  shots: [],
  setShots: (shots) => set({ shots }),
}));
