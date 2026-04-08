/**
 * PotholeDetector — runs inside the R3F <Canvas> to detect potholes
 * every frame, project their 3D positions to screen-space bounding boxes,
 * and push results to the potholeDetectionStore for the HTML overlay.
 *
 * Supports early detection up to ~55 meters ahead with depth-aware rendering
 * and temporal smoothing to prevent flickering on distant objects.
 *
 * Also sends detection data to the backend API at a throttled rate.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { simFrameData } from '@/stores/simulationStore';
import { usePotholeDetectionStore, DetectedPothole, DepthZone } from '@/stores/potholeDetectionStore';
import { useSimulationStore } from '@/stores/simulationStore';
import { sharedActiveChunks } from '@/stores/sharedChunks';

// Reusable vectors to avoid GC
const _v3 = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();
const _v3d = new THREE.Vector3();

// ─── Detection Configuration ──────────────────────────────────────
/** Maximum forward detection range in world units (~meters) */
const DETECT_RANGE_FORWARD = 55;
/** How far behind the car to still detect */
const DETECT_BEHIND = 5;
/** Total effective detection range for confidence calculation */
const TOTAL_RANGE = DETECT_RANGE_FORWARD + DETECT_BEHIND;

// ─── Depth Zone Thresholds ────────────────────────────────────────
const NEAR_THRESHOLD = 20;
const MID_THRESHOLD = 40;
// FAR is anything beyond MID_THRESHOLD up to DETECT_RANGE_FORWARD

// ─── Smoothing Configuration ─────────────────────────────────────
/** EMA (exponential moving average) factor: higher = snappier, lower = smoother */
const SMOOTH_ALPHA_NEAR = 0.5;   // Near objects follow faster
const SMOOTH_ALPHA_MID = 0.35;   // Mid-range moderate smoothing
const SMOOTH_ALPHA_FAR = 0.2;    // Far objects are heavily smoothed to prevent flicker

/** Minimum frames a detection must persist before being shown (anti-flicker) */
const MIN_STABLE_FRAMES_NEAR = 1;
const MIN_STABLE_FRAMES_MID = 2;
const MIN_STABLE_FRAMES_FAR = 3;

/** How many frames a detection can be missing before being removed */
const GRACE_FRAMES_NEAR = 3;
const GRACE_FRAMES_MID = 5;
const GRACE_FRAMES_FAR = 8;

// ─── Tracking State Per-Detection ─────────────────────────────────
interface TrackedDetection {
  /** Smoothed screen box (EMA-averaged) */
  smoothBox: { x: number; y: number; width: number; height: number };
  /** How many consecutive frames this detection has been visible */
  stableFrames: number;
  /** How many consecutive frames this detection has been missing */
  missingFrames: number;
  /** Last raw detection data */
  lastRaw: DetectedPothole;
  /** First detection timestamp */
  firstSeen: number;
}

/** Project a 3D world point to normalized screen coordinates (0..1) */
function projectToScreen(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
): { x: number; y: number; visible: boolean } {
  _v3.copy(worldPos);
  _v3.project(camera);

  // NDC ranges from -1 to 1; convert to 0..1
  const x = (_v3.x + 1) / 2;
  const y = (1 - _v3.y) / 2; // flip Y
  const visible = _v3.z > 0 && _v3.z < 1 && x > -0.2 && x < 1.2 && y > -0.2 && y < 1.2;

  return { x, y, visible };
}

/** Approximate screen-space bounding box size from pothole world scale and distance */
function estimateScreenBoxSize(
  worldPos: THREE.Vector3,
  scale: [number, number, number],
  camera: THREE.Camera,
  distance: number,
): { width: number; height: number } {
  const halfW = scale[0] / 2;
  const halfD = scale[2] / 2;

  // Project the four corners of the pothole to get bounds
  _v3b.set(worldPos.x - halfW, worldPos.y, worldPos.z - halfD);
  _v3c.set(worldPos.x + halfW, worldPos.y, worldPos.z + halfD);

  _v3b.project(camera);
  _v3c.project(camera);

  const x1 = (_v3b.x + 1) / 2;
  const y1 = (1 - _v3b.y) / 2;
  const x2 = (_v3c.x + 1) / 2;
  const y2 = (1 - _v3c.y) / 2;

  // Also project top edge for vertical extent (since potholes are flat, add some height)
  // Scale heigh boost inversely with distance for realistic perspective
  const heightBoost = Math.max(0.15, 0.5 * (1 - distance / DETECT_RANGE_FORWARD));
  _v3d.set(worldPos.x, worldPos.y + heightBoost, worldPos.z);
  _v3d.project(camera);
  const yTop = (1 - _v3d.y) / 2;

  const width = Math.abs(x2 - x1);
  const height = Math.max(Math.abs(y2 - y1), Math.abs(yTop - (y1 + y2) / 2) * 2);

  // Distance-adaptive minimum sizes:
  // Far objects get smaller minimum so they appear correctly tiny
  // Near objects get larger minimum for visibility
  const minScale = distance > MID_THRESHOLD
    ? { w: 0.008, h: 0.006 }   // Far: very small minimums
    : distance > NEAR_THRESHOLD
      ? { w: 0.015, h: 0.012 } // Mid: moderate minimums
      : { w: 0.025, h: 0.02 }; // Near: original minimums

  return {
    width: Math.max(width, minScale.w),
    height: Math.max(height, minScale.h),
  };
}

/** Classify distance into depth zone */
function getDepthZone(distance: number): DepthZone {
  if (distance < NEAR_THRESHOLD) return 'near';
  if (distance < MID_THRESHOLD) return 'mid';
  return 'far';
}

/** Get smoothing alpha based on depth zone */
function getSmoothAlpha(zone: DepthZone): number {
  switch (zone) {
    case 'near': return SMOOTH_ALPHA_NEAR;
    case 'mid': return SMOOTH_ALPHA_MID;
    case 'far': return SMOOTH_ALPHA_FAR;
  }
}

/** Get minimum stable frames required based on depth zone */
function getMinStableFrames(zone: DepthZone): number {
  switch (zone) {
    case 'near': return MIN_STABLE_FRAMES_NEAR;
    case 'mid': return MIN_STABLE_FRAMES_MID;
    case 'far': return MIN_STABLE_FRAMES_FAR;
  }
}

/** Get grace frames based on depth zone */
function getGraceFrames(zone: DepthZone): number {
  switch (zone) {
    case 'near': return GRACE_FRAMES_NEAR;
    case 'mid': return GRACE_FRAMES_MID;
    case 'far': return GRACE_FRAMES_FAR;
  }
}

/** EMA smooth a single box value */
function emaSmooth(current: number, target: number, alpha: number): number {
  return current + alpha * (target - current);
}

export function PotholeDetector() {
  const { camera } = useThree();
  const lastApiCall = useRef(0);
  const prevPotholeCount = useRef(0);
  const setDetectedPotholes = usePotholeDetectionStore((s) => s.setDetectedPotholes);
  const isDetectionActive = usePotholeDetectionStore((s) => s.isDetectionActive);

  // Persistent tracking state across frames (no React state to avoid re-renders)
  const trackedRef = useRef<Map<string, TrackedDetection>>(new Map());

  useFrame(() => {
    if (!isDetectionActive) {
      if (prevPotholeCount.current > 0) {
        setDetectedPotholes([]);
        prevPotholeCount.current = 0;
        trackedRef.current.clear();
      }
      return;
    }

    const activeChunks = sharedActiveChunks.current;
    if (!activeChunks || activeChunks.length === 0) return;

    const carPos = new THREE.Vector3(...simFrameData.carPosition);
    const carRot = simFrameData.carRotation;
    const now = Date.now();

    // ─── Step 1: Gather raw detections this frame ─────────────────
    const rawDetections = new Map<string, DetectedPothole>();

    for (const chunk of activeChunks) {
      for (const item of chunk.scenery) {
        if (item.type !== 'pothole' && item.type !== 'debris' && item.type !== 'rock') continue;

        const itemPos = new THREE.Vector3(...item.position);
        const distance = carPos.distanceTo(itemPos);

        // Extended detection range
        if (distance > DETECT_RANGE_FORWARD) continue;

        // Check if the pothole is roughly in front of the car
        const dx = itemPos.x - carPos.x;
        const dz = itemPos.z - carPos.z;
        const forwardX = -Math.sin(carRot);
        const forwardZ = -Math.cos(carRot);
        const dot = dx * forwardX + dz * forwardZ;

        // Only show potholes ahead or slightly behind
        if (dot < -DETECT_BEHIND) continue;

        // Project center to screen
        const center = projectToScreen(itemPos, camera);
        if (!center.visible) continue;

        // Get screen box size with distance-aware scaling
        const boxSize = estimateScreenBoxSize(itemPos, item.scale, camera, distance);

        // Depth zone classification
        const depthZone = getDepthZone(distance);

        // Confidence based on distance — improved curve for better far-range sensitivity
        // Near: ~0.95, Mid: ~0.7-0.85, Far: ~0.5-0.7
        const normalizedDist = distance / TOTAL_RANGE;
        const confidence = Math.max(0.45, 1 - normalizedDist * 0.6);

        // Also factor in object size for confidence (larger objects are more detectable at distance)
        const objectArea = item.scale[0] * item.scale[2];
        const sizeBoost = Math.min(0.1, objectArea * 0.02);
        const finalConfidence = Math.min(1, confidence + sizeBoost);

        const potholeId = `${item.position[0].toFixed(1)}-${item.position[2].toFixed(1)}`;

        rawDetections.set(potholeId, {
          id: potholeId,
          worldPosition: item.position,
          screenBox: {
            x: center.x - boxSize.width / 2,
            y: center.y - boxSize.height / 2,
            width: boxSize.width,
            height: boxSize.height,
          },
          worldScale: item.scale,
          type: item.type as 'pothole' | 'debris' | 'rock',
          distance,
          confidence: finalConfidence,
          detectedAt: now,
          depthZone,
        });
      }
    }

    // ─── Step 2: Update tracking state with temporal smoothing ────
    const tracked = trackedRef.current;

    // Update existing tracks and create new ones
    for (const [id, raw] of rawDetections) {
      const existing = tracked.get(id);
      const zone = raw.depthZone;
      const alpha = getSmoothAlpha(zone);

      if (existing) {
        // Update existing track: smooth the screen box
        const rawBox = raw.screenBox!;
        existing.smoothBox = {
          x: emaSmooth(existing.smoothBox.x, rawBox.x, alpha),
          y: emaSmooth(existing.smoothBox.y, rawBox.y, alpha),
          width: emaSmooth(existing.smoothBox.width, rawBox.width, alpha),
          height: emaSmooth(existing.smoothBox.height, rawBox.height, alpha),
        };
        existing.stableFrames++;
        existing.missingFrames = 0;
        existing.lastRaw = raw;
      } else {
        // New detection: initialize track
        tracked.set(id, {
          smoothBox: { ...raw.screenBox! },
          stableFrames: 1,
          missingFrames: 0,
          lastRaw: raw,
          firstSeen: now,
        });
      }
    }

    // Handle tracks that are no longer detected this frame
    for (const [id, track] of tracked) {
      if (!rawDetections.has(id)) {
        track.missingFrames++;
        const grace = getGraceFrames(track.lastRaw.depthZone);
        if (track.missingFrames > grace) {
          tracked.delete(id);
        }
      }
    }

    // ─── Step 3: Build final detections list from stable tracks ───
    const detections: DetectedPothole[] = [];

    for (const [, track] of tracked) {
      const minFrames = getMinStableFrames(track.lastRaw.depthZone);
      if (track.stableFrames < minFrames) continue; // Not stable enough yet

      detections.push({
        ...track.lastRaw,
        screenBox: { ...track.smoothBox },
      });
    }

    // Sort by distance (closest first)
    detections.sort((a, b) => a.distance - b.distance);

    setDetectedPotholes(detections);
    prevPotholeCount.current = detections.length;

    // Send to backend API at most every 2 seconds when new potholes are detected
    if (detections.length > 0 && now - lastApiCall.current > 2000) {
      lastApiCall.current = now;
      const mode = useSimulationStore.getState().mode;
      sendDetectionToApi(detections, mode);
    }
  });

  return null;
}

/** Fire-and-forget: send detection data to the backend */
async function sendDetectionToApi(
  detections: DetectedPothole[],
  mode: string,
) {
  try {
    await fetch('http://localhost:5050/api/road-damage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        speed: simFrameData.speed,
        detections: detections.map((d) => ({
          type: d.type,
          worldPosition: d.worldPosition,
          distance: d.distance,
          confidence: d.confidence,
          depthZone: d.depthZone,
        })),
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Backend may be offline — no-op
  }
}
