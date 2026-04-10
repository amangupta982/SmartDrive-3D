/**
 * LaneDetector — renders semi-transparent cyan/blue lane guide lines
 * directly on the 3D road surface inside the R3F Canvas.
 *
 * Features:
 * - Left/right edge lines with glow
 * - Center dashed guide line
 * - Current-lane floor highlight
 * - Scanning sweep animation
 * - Lane departure detection + edge warning pulse
 * - Mode-adaptive styling (city/village/jungle)
 *
 * Runs alongside (and does NOT interfere with) PotholeDetector.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore, simFrameData, EnvironmentMode } from '@/stores/simulationStore';
import { useLaneDetectionStore } from '@/stores/laneDetectionStore';

// ── Geometry constants ───────────────────────────────────────────
const LANE_AHEAD = 80;
const LANE_BEHIND = 15;
const LANE_TOTAL = LANE_AHEAD + LANE_BEHIND;
const Y_OFFSET = 0.03; // above road to prevent z-fighting

// ── Pre-allocated color objects ──────────────────────────────────
const CYAN = new THREE.Color('#00d4ff');
const AMBER = new THREE.Color('#ff6600');
const _color = new THREE.Color();

// ── Mode-specific lane configuration ─────────────────────────────
interface LaneConfig {
  roadWidth: number;
  leftEdgeX: number;
  rightEdgeX: number;
  hasCenterDashes: boolean;
  solidWidth: number;
  glowWidth: number;
  dashWidth: number;
  dashLength: number;
  dashGap: number;
  solidOpacity: number;
  glowOpacity: number;
  dashOpacity: number;
  departureThreshold: number;
}

function getLaneConfig(mode: EnvironmentMode): LaneConfig {
  switch (mode) {
    case 'city': {
      const rw = 10;
      return {
        roadWidth: rw,
        leftEdgeX: -(rw / 2 - 0.3),
        rightEdgeX: rw / 2 - 0.3,
        hasCenterDashes: true,
        solidWidth: 0.1,
        glowWidth: 0.45,
        dashWidth: 0.07,
        dashLength: 3,
        dashGap: 3,
        solidOpacity: 0.5,
        glowOpacity: 0.12,
        dashOpacity: 0.4,
        departureThreshold: rw / 2 - 1.3,
      };
    }
    case 'village': {
      const rw = 6;
      return {
        roadWidth: rw,
        leftEdgeX: -(rw / 2),
        rightEdgeX: rw / 2,
        hasCenterDashes: true,
        solidWidth: 0.08,
        glowWidth: 0.35,
        dashWidth: 0.06,
        dashLength: 4,
        dashGap: 4,
        solidOpacity: 0.35,
        glowOpacity: 0.08,
        dashOpacity: 0.25,
        departureThreshold: rw / 2 - 1.0,
      };
    }
    default: {
      // jungle
      const rw = 7;
      return {
        roadWidth: rw,
        leftEdgeX: -(rw / 2),
        rightEdgeX: rw / 2,
        hasCenterDashes: false,
        solidWidth: 0.06,
        glowWidth: 0.28,
        dashWidth: 0.05,
        dashLength: 3,
        dashGap: 5,
        solidOpacity: 0.25,
        glowOpacity: 0.06,
        dashOpacity: 0.18,
        departureThreshold: rw / 2 - 1.0,
      };
    }
  }
}

// ── Dash positions memo ──────────────────────────────────────────
function generateDashPositions(dashLen: number, gap: number): number[] {
  const positions: number[] = [];
  const step = dashLen + gap;
  for (let z = 0; z < LANE_TOTAL; z += step) {
    positions.push(z + dashLen / 2);
  }
  return positions;
}

// ── LaneLine sub-component ──────────────────────────────────────
function LaneLine({
  x,
  solidWidth,
  glowWidth,
  solidOpacity,
  glowOpacity,
  solidMatRef,
}: {
  x: number;
  solidWidth: number;
  glowWidth: number;
  solidOpacity: number;
  glowOpacity: number;
  solidMatRef?: React.Ref<THREE.MeshBasicMaterial>;
}) {
  return (
    <group position={[x, Y_OFFSET, LANE_TOTAL / 2]}>
      {/* Glow layer (wider, fainter) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[glowWidth, LANE_TOTAL]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={glowOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Solid line (thin, brighter) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[solidWidth, LANE_TOTAL]} />
        <meshBasicMaterial
          ref={solidMatRef}
          color="#00d4ff"
          transparent
          opacity={solidOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function LaneDetector() {
  const isActive = useLaneDetectionStore((s) => s.isLaneDetectionActive);
  const setWarning = useLaneDetectionStore((s) => s.setLaneDepartureWarning);
  const setLane = useLaneDetectionStore((s) => s.setCurrentLane);
  const mode = useSimulationStore((s) => s.mode);

  const groupRef = useRef<THREE.Group>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);
  const leftMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const rightMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const prevWarning = useRef<string | null>(null);
  const prevLane = useRef<string>('right');

  const config = useMemo(() => getLaneConfig(mode), [mode]);

  const dashPositions = useMemo(
    () => generateDashPositions(config.dashLength, config.dashGap),
    [config.dashLength, config.dashGap],
  );

  useFrame((state) => {
    if (!isActive || !groupRef.current) return;

    const carZ = simFrameData.carPosition[2];
    const carX = simFrameData.carPosition[0];

    // Follow the car
    groupRef.current.position.z = carZ - LANE_BEHIND;

    // ── Scan animation ───────────────────────────────────
    if (scanRef.current) {
      const t = (state.clock.elapsedTime * 0.35) % 1;
      scanRef.current.position.z = t * LANE_TOTAL;
      const scanMat = scanRef.current.material as THREE.MeshBasicMaterial;
      scanMat.opacity = 0.2 * Math.sin(t * Math.PI);
    }

    // ── Current lane highlight ───────────────────────────
    if (highlightRef.current) {
      const targetX = carX > 0
        ? config.roadWidth / 4
        : -config.roadWidth / 4;
      highlightRef.current.position.x +=
        (targetX - highlightRef.current.position.x) * 0.08;
    }

    // ── Lane departure detection ─────────────────────────
    const isOff = Math.abs(carX) > config.departureThreshold;
    const warning: 'left' | 'right' | null = isOff
      ? carX < 0 ? 'left' : 'right'
      : null;
    if (warning !== prevWarning.current) {
      prevWarning.current = warning;
      setWarning(warning);
    }

    // ── Current lane ─────────────────────────────────────
    const lane: 'left' | 'right' = carX > 0 ? 'right' : 'left';
    if (lane !== prevLane.current) {
      prevLane.current = lane;
      setLane(lane);
    }

    // ── Edge warning pulse ───────────────────────────────
    const pulse = Math.sin(state.clock.elapsedTime * 8) * 0.5 + 0.5;
    if (leftMatRef.current) {
      if (warning === 'left') {
        _color.lerpColors(CYAN, AMBER, pulse);
        leftMatRef.current.color.copy(_color);
        leftMatRef.current.opacity = config.solidOpacity + pulse * 0.35;
      } else {
        leftMatRef.current.color.copy(CYAN);
        leftMatRef.current.opacity = config.solidOpacity;
      }
    }
    if (rightMatRef.current) {
      if (warning === 'right') {
        _color.lerpColors(CYAN, AMBER, pulse);
        rightMatRef.current.color.copy(_color);
        rightMatRef.current.opacity = config.solidOpacity + pulse * 0.35;
      } else {
        rightMatRef.current.color.copy(CYAN);
        rightMatRef.current.opacity = config.solidOpacity;
      }
    }
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef} renderOrder={2}>
      {/* ── Left edge line ─────────────────────────────── */}
      <LaneLine
        x={config.leftEdgeX}
        solidWidth={config.solidWidth}
        glowWidth={config.glowWidth}
        solidOpacity={config.solidOpacity}
        glowOpacity={config.glowOpacity}
        solidMatRef={leftMatRef}
      />

      {/* ── Right edge line ────────────────────────────── */}
      <LaneLine
        x={config.rightEdgeX}
        solidWidth={config.solidWidth}
        glowWidth={config.glowWidth}
        solidOpacity={config.solidOpacity}
        glowOpacity={config.glowOpacity}
        solidMatRef={rightMatRef}
      />

      {/* ── Center dashes ──────────────────────────────── */}
      {config.hasCenterDashes &&
        dashPositions.map((z, i) => (
          <group key={`dash-${i}`}>
            {/* Dash glow */}
            <mesh
              position={[0, Y_OFFSET, z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[config.glowWidth * 0.6, config.dashLength]} />
              <meshBasicMaterial
                color="#0099cc"
                transparent
                opacity={config.glowOpacity * 0.8}
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {/* Dash solid */}
            <mesh
              position={[0, Y_OFFSET + 0.001, z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[config.dashWidth, config.dashLength]} />
              <meshBasicMaterial
                color="#00bbdd"
                transparent
                opacity={config.dashOpacity}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}

      {/* ── Current lane highlight ──────────────────────── */}
      <mesh
        ref={highlightRef}
        position={[config.roadWidth / 4, Y_OFFSET - 0.005, LANE_TOTAL / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[config.roadWidth / 2 - 0.5, 35]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.025}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ── Scan sweep line ────────────────────────────── */}
      <mesh
        ref={scanRef}
        position={[0, Y_OFFSET + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[config.roadWidth - 0.5, 0.6]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
