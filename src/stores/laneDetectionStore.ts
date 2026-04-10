import { create } from 'zustand';

export interface LaneDetectionState {
  isLaneDetectionActive: boolean;
  laneDepartureWarning: 'left' | 'right' | null;
  currentLane: 'left' | 'right';
  toggleLaneDetection: () => void;
  setLaneDepartureWarning: (w: 'left' | 'right' | null) => void;
  setCurrentLane: (lane: 'left' | 'right') => void;
}

export const useLaneDetectionStore = create<LaneDetectionState>((set) => ({
  isLaneDetectionActive: true,
  laneDepartureWarning: null,
  currentLane: 'right',
  toggleLaneDetection: () => set((s) => ({
    isLaneDetectionActive: !s.isLaneDetectionActive,
    laneDepartureWarning: s.isLaneDetectionActive ? null : s.laneDepartureWarning,
  })),
  setLaneDepartureWarning: (laneDepartureWarning) => set({ laneDepartureWarning }),
  setCurrentLane: (currentLane) => set({ currentLane }),
}));
