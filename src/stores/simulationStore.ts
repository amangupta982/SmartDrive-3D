import { create } from 'zustand';

export type EnvironmentMode = 'city' | 'village' | 'jungle';
export type TimeOfDay = 'day' | 'night';
export type CameraView = 'third-person' | 'first-person';

export interface DetectionAlert {
  id: string;
  type: 'pothole' | 'debris' | 'rock' | 'fallen_tree';
  severity: 'critical' | 'warning' | 'info';
  distance: string;
  location: string;
  timestamp: number;
  mode: EnvironmentMode;
}

// --- Reactive store for UI-driven state only ---
interface SimulationState {
  mode: EnvironmentMode;
  timeOfDay: TimeOfDay;
  headlightsOn: boolean;
  cameraView: CameraView;
  detectionAlerts: DetectionAlert[];
  setMode: (mode: EnvironmentMode) => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  toggleTimeOfDay: () => void;
  setHeadlightsOn: (on: boolean) => void;
  toggleHeadlights: () => void;
  setCameraView: (view: CameraView) => void;
  toggleCameraView: () => void;
  addDetectionAlert: (alert: Omit<DetectionAlert, 'id' | 'timestamp'>) => void;
  clearOldAlerts: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  mode: 'city',
  timeOfDay: 'day',
  headlightsOn: false,
  cameraView: 'third-person',
  detectionAlerts: [],
  setMode: (mode) => set({ mode }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  toggleTimeOfDay: () => set((s) => ({ 
    timeOfDay: s.timeOfDay === 'day' ? 'night' : 'day',
    headlightsOn: s.timeOfDay === 'day' ? true : false 
  })),
  setHeadlightsOn: (headlightsOn) => set({ headlightsOn }),
  toggleHeadlights: () => set((s) => ({ headlightsOn: !s.headlightsOn })),
  setCameraView: (cameraView) => set({ cameraView }),
  toggleCameraView: () => set((s) => ({
    cameraView: s.cameraView === 'third-person' ? 'first-person' : 'third-person'
  })),
  addDetectionAlert: (alert) => set((s) => ({
    detectionAlerts: [
      {
        ...alert,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      },
      ...s.detectionAlerts,
    ].slice(0, 20),
  })),
  clearOldAlerts: () => set((s) => ({
    detectionAlerts: s.detectionAlerts.filter(
      (a) => Date.now() - a.timestamp < 30000
    ),
  })),
}));

// --- Non-reactive mutable refs for per-frame data (no React re-renders) ---
// These values change every frame and should NEVER trigger re-renders.
export const simFrameData = {
  speed: 0,
  maxSpeed: 150,
  carPosition: [0, 0.4, 0] as [number, number, number],
  carRotation: 0,
  steeringInput: 0,
  shakeIntensity: 0,
  isColliding: false,
};
