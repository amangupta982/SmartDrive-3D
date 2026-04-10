import { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Vehicle } from './Vehicle';
import { World } from './World';
import { CameraController } from './CameraController';
import { SkyAndLighting } from './SkyAndLighting';
import { CockpitInterior } from './CockpitInterior';
import { PotholeDetector } from './PotholeDetector';
import { LaneDetector } from './LaneDetector';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSimulationStore } from '@/stores/simulationStore';
import { usePotholeDetectionStore } from '@/stores/potholeDetectionStore';
import { useLaneDetectionStore } from '@/stores/laneDetectionStore';

function KeyboardShortcuts() {
  const { toggleTimeOfDay, toggleHeadlights, toggleCameraView } = useSimulationStore();
  const { toggleDetection } = usePotholeDetectionStore();
  const { toggleLaneDetection } = useLaneDetectionStore();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') toggleTimeOfDay();
      if (e.key.toLowerCase() === 'l') toggleHeadlights();
      if (e.key.toLowerCase() === 'v') toggleCameraView();
      if (e.key.toLowerCase() === 'd') toggleDetection();
      if (e.key.toLowerCase() === 'g') toggleLaneDetection();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleTimeOfDay, toggleHeadlights, toggleCameraView, toggleDetection, toggleLaneDetection]);

  return null;
}

export function SimulationCanvas() {
  const keys = useKeyboard();
  const obstacles = useRef<Array<{ position: THREE.Vector3; radius: number }>>([]);

  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      }}
      camera={{ fov: 65, near: 0.1, far: 1000, position: [0, 6, -10] }}
      style={{ width: '100%', height: '100%' }}
    >
      <SkyAndLighting />
      <CameraController />
      <Vehicle keys={keys} obstacles={obstacles} />
      <CockpitInterior />
      <World obstacles={obstacles} />
      <PotholeDetector />
      <LaneDetector />
      <KeyboardShortcuts />
    </Canvas>
  );
}
