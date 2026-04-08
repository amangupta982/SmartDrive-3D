import { create } from 'zustand';

/** Depth zone classification for distance-aware rendering */
export type DepthZone = 'far' | 'mid' | 'near';

export interface DetectedPothole {
  id: string;
  /** World position [x, y, z] */
  worldPosition: [number, number, number];
  /** Screen-space bounding box (normalized 0–1) */
  screenBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /** Size of the pothole in world units */
  worldScale: [number, number, number];
  /** Type of road damage */
  type: 'pothole' | 'debris' | 'rock';
  /** How far from the car (world units) */
  distance: number;
  /** Confidence (simulated) */
  confidence: number;
  /** Timestamp when first detected */
  detectedAt: number;
  /** Depth zone: 'far' (40-55m), 'mid' (20-40m), 'near' (<20m) */
  depthZone: DepthZone;
}

interface PotholeDetectionState {
  detectedPotholes: DetectedPothole[];
  isDetectionActive: boolean;
  setDetectedPotholes: (potholes: DetectedPothole[]) => void;
  toggleDetection: () => void;
}

export const usePotholeDetectionStore = create<PotholeDetectionState>((set) => ({
  detectedPotholes: [],
  isDetectionActive: true,
  setDetectedPotholes: (potholes) => set({ detectedPotholes: potholes }),
  toggleDetection: () => set((s) => ({ isDetectionActive: !s.isDetectionActive })),
}));
