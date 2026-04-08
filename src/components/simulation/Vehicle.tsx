import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore, simFrameData } from '@/stores/simulationStore';
import { KeyState } from '@/hooks/useKeyboard';

interface VehicleProps {
  keys: React.MutableRefObject<KeyState>;
  obstacles: React.MutableRefObject<Array<{ position: THREE.Vector3; radius: number }>>;
}

function Headlight({ position, targetPos, on }: { 
  position: [number, number, number]; 
  targetPos: [number, number, number];
  on: boolean;
}) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      <object3D ref={targetRef} position={targetPos} />
      <spotLight
        ref={lightRef}
        position={position}
        angle={0.45}
        penumbra={0.6}
        intensity={on ? 50 : 0}
        color="#fff8e0"
        distance={80}
        decay={1.5}
      />
      {on && (
        <mesh position={position}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#ffffcc" transparent opacity={0.9} />
        </mesh>
      )}
    </>
  );
}

export function Vehicle({ keys, obstacles }: VehicleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const velocityRef = useRef(0);
  const rotationRef = useRef(0);
  
  const { headlightsOn, cameraView } = useSimulationStore();

  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const frontWheelGroupRefs = useRef<THREE.Group[]>([]);

  // Brighter car materials for better visibility in third-person
  const carMaterials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: '#2a3a5e', metalness: 0.8, roughness: 0.2 }),
    bodyDark: new THREE.MeshStandardMaterial({ color: '#1e2d4a', metalness: 0.75, roughness: 0.25 }),
    accent: new THREE.MeshStandardMaterial({ color: '#00e5ff', metalness: 0.6, roughness: 0.3, emissive: '#00e5ff', emissiveIntensity: 0.4 }),
    accentDim: new THREE.MeshStandardMaterial({ color: '#007799', metalness: 0.6, roughness: 0.3, emissive: '#00e5ff', emissiveIntensity: 0.15 }),
    glass: new THREE.MeshStandardMaterial({ color: '#88ccdd', metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.5 }),
    glassDark: new THREE.MeshStandardMaterial({ color: '#445566', metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.7 }),
    wheel: new THREE.MeshStandardMaterial({ color: '#1a1a1a', metalness: 0.2, roughness: 0.9 }),
    wheelRim: new THREE.MeshStandardMaterial({ color: '#aaaaaa', metalness: 0.9, roughness: 0.15 }),
    headlightOff: new THREE.MeshStandardMaterial({ color: '#dddddd', metalness: 0.5, roughness: 0.3 }),
    headlightOn: new THREE.MeshStandardMaterial({ color: '#ffffcc', emissive: '#ffffaa', emissiveIntensity: 2 }),
    taillight: new THREE.MeshStandardMaterial({ color: '#ff3333', emissive: '#ff0000', emissiveIntensity: 0.8 }),
    taillightBrake: new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#ff0000', emissiveIntensity: 2 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#dddddd', metalness: 0.95, roughness: 0.05 }),
    bumper: new THREE.MeshStandardMaterial({ color: '#333344', metalness: 0.5, roughness: 0.4 }),
    mirror: new THREE.MeshStandardMaterial({ color: '#2a3a5e', metalness: 0.8, roughness: 0.2 }),
    interior: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.85, metalness: 0.1 }),
    mirrorGlass: new THREE.MeshStandardMaterial({ color: '#556677', metalness: 0.95, roughness: 0.05 }),
    grille: new THREE.MeshStandardMaterial({ color: '#111111', metalness: 0.5, roughness: 0.5 }),
    tireBlack: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.95 }),
  }), []);

  const hlMat = headlightsOn ? carMaterials.headlightOn : carMaterials.headlightOff;
  const isBraking = keys.current.brake || keys.current.backward;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    const k = keys.current;
    const accel = 25;
    const decel = 15;
    const brakeForce = 45;
    const turnSpeed = 1.8;

    let vel = velocityRef.current;

    if (k.forward && !simFrameData.isColliding) {
      vel = Math.min(vel + accel * dt, 150);
    } else if (k.backward) {
      vel = Math.max(vel - brakeForce * dt, -30);
    } else if (k.brake) {
      vel = vel > 0 ? Math.max(vel - brakeForce * dt, 0) : Math.min(vel + brakeForce * dt, 0);
    } else {
      if (vel > 0) vel = Math.max(vel - decel * dt, 0);
      else if (vel < 0) vel = Math.min(vel + decel * dt, 0);
    }

    if (simFrameData.isColliding && vel > 0) vel = 0;
    velocityRef.current = vel;

    const speedMs = vel * 0.2778;

    // Steering
    let currentSteer = 0;
    if (Math.abs(vel) > 1) {
      const turnFactor = Math.min(Math.abs(vel) / 50, 1);
      if (k.left) { rotationRef.current += turnSpeed * turnFactor * dt; currentSteer = 1; }
      if (k.right) { rotationRef.current -= turnSpeed * turnFactor * dt; currentSteer = -1; }
    }
    simFrameData.steeringInput = currentSteer;

    const rot = rotationRef.current;
    const moveX = -Math.sin(rot) * speedMs * dt;
    const moveZ = -Math.cos(rot) * speedMs * dt;
    const newX = groupRef.current.position.x + moveX;
    const newZ = groupRef.current.position.z + moveZ;

    let collided = false;
    const carPos = new THREE.Vector3(newX, 0, newZ);
    for (const obs of obstacles.current) {
      const dist = carPos.distanceTo(new THREE.Vector3(obs.position.x, 0, obs.position.z));
      if (dist < obs.radius + 1.2) { collided = true; break; }
    }

    if (collided && vel > 0) {
      simFrameData.isColliding = true;
      velocityRef.current = 0;
      simFrameData.shakeIntensity = 0.3;
    } else {
      simFrameData.isColliding = false;
      groupRef.current.position.x = newX;
      groupRef.current.position.z = newZ;
    }

    groupRef.current.rotation.y = rot;
    simFrameData.speed = Math.abs(vel);
    simFrameData.carPosition = [groupRef.current.position.x, 0.4, groupRef.current.position.z];
    simFrameData.carRotation = rot;

    // Wheel rotation
    wheelRefs.current.forEach(w => {
      if (w) w.rotation.x += speedMs * dt * 2;
    });

    // Front wheel steering visual
    const steerAngle = currentSteer * 0.35;
    frontWheelGroupRefs.current.forEach(g => {
      if (g) {
        g.rotation.y += (steerAngle - g.rotation.y) * 0.2;
      }
    });

    const posHash = Math.sin(groupRef.current.position.z * 0.5) * 0.5 + Math.sin(groupRef.current.position.x * 0.3) * 0.3;
    if (Math.abs(vel) > 10 && Math.abs(posHash) > 0.3) {
      simFrameData.shakeIntensity = Math.abs(posHash) * 0.05 * Math.min(Math.abs(vel) / 100, 1);
    } else if (!collided) {
      simFrameData.shakeIntensity = 0;
    }
  });

  const addWheelRef = (el: THREE.Mesh | null, idx: number) => {
    if (el) wheelRefs.current[idx] = el;
  };

  const addFrontWheelGroupRef = (el: THREE.Group | null, idx: number) => {
    if (el) frontWheelGroupRefs.current[idx] = el;
  };

  // In first-person, hide the outer car body but keep physics
  const bodyVisible = cameraView !== 'first-person';

  return (
    <group ref={groupRef} position={[0, 0.4, 0]}>
      {bodyVisible && (
        <>
          {/* ===== ENHANCED CAR BODY ===== */}

          {/* Main body - lower */}
          <mesh position={[0, 0.3, 0]} material={carMaterials.body} castShadow>
            <boxGeometry args={[2, 0.4, 4.6]} />
          </mesh>

          {/* Hood (slopes downward toward front) */}
          <mesh position={[0, 0.45, -1.4]} rotation={[-0.08, 0, 0]} material={carMaterials.body} castShadow>
            <boxGeometry args={[1.9, 0.12, 1.4]} />
          </mesh>

          {/* Trunk (slightly raised) */}
          <mesh position={[0, 0.45, 1.6]} rotation={[0.05, 0, 0]} material={carMaterials.body} castShadow>
            <boxGeometry args={[1.85, 0.1, 1.2]} />
          </mesh>

          {/* Cabin */}
          <mesh position={[0, 0.72, 0.15]} material={carMaterials.body} castShadow>
            <boxGeometry args={[1.7, 0.42, 2.4]} />
          </mesh>

          {/* Roof */}
          <mesh position={[0, 0.96, 0.2]} material={carMaterials.bodyDark} castShadow>
            <boxGeometry args={[1.65, 0.06, 2.0]} />
          </mesh>

          {/* Windshield (front = -Z) */}
          <mesh position={[0, 0.78, -0.9]} rotation={[-0.35, 0, 0]} material={carMaterials.glass}>
            <boxGeometry args={[1.55, 0.5, 0.04]} />
          </mesh>

          {/* Rear window (back = +Z) */}
          <mesh position={[0, 0.78, 1.35]} rotation={[0.35, 0, 0]} material={carMaterials.glassDark}>
            <boxGeometry args={[1.5, 0.45, 0.04]} />
          </mesh>

          {/* Side windows - left */}
          <mesh position={[-0.86, 0.76, 0.15]} material={carMaterials.glass}>
            <boxGeometry args={[0.04, 0.32, 1.8]} />
          </mesh>

          {/* Side windows - right */}
          <mesh position={[0.86, 0.76, 0.15]} material={carMaterials.glass}>
            <boxGeometry args={[0.04, 0.32, 1.8]} />
          </mesh>

          {/* Window trim - left */}
          <mesh position={[-0.87, 0.57, 0.15]} material={carMaterials.chrome}>
            <boxGeometry args={[0.02, 0.02, 1.85]} />
          </mesh>

          {/* Window trim - right */}
          <mesh position={[0.87, 0.57, 0.15]} material={carMaterials.chrome}>
            <boxGeometry args={[0.02, 0.02, 1.85]} />
          </mesh>

          {/* Bottom accent strip */}
          <mesh position={[0, 0.11, 0]} material={carMaterials.accent}>
            <boxGeometry args={[2.05, 0.03, 4.65]} />
          </mesh>

          {/* Side skirt accent - left */}
          <mesh position={[-1.01, 0.18, 0]} material={carMaterials.accentDim}>
            <boxGeometry args={[0.02, 0.08, 3.8]} />
          </mesh>

          {/* Side skirt accent - right */}
          <mesh position={[1.01, 0.18, 0]} material={carMaterials.accentDim}>
            <boxGeometry args={[0.02, 0.08, 3.8]} />
          </mesh>

          {/* Front bumper */}
          <mesh position={[0, 0.22, -2.32]} material={carMaterials.bumper} castShadow>
            <boxGeometry args={[2.05, 0.25, 0.12]} />
          </mesh>

          {/* Front splitter */}
          <mesh position={[0, 0.09, -2.35]} material={carMaterials.accent}>
            <boxGeometry args={[1.8, 0.02, 0.06]} />
          </mesh>

          {/* Front grille */}
          <mesh position={[0, 0.32, -2.31]} material={carMaterials.grille}>
            <boxGeometry args={[1.4, 0.12, 0.02]} />
          </mesh>

          {/* Grille accent line */}
          <mesh position={[0, 0.34, -2.32]} material={carMaterials.accent}>
            <boxGeometry args={[1.3, 0.015, 0.02]} />
          </mesh>

          {/* Rear bumper */}
          <mesh position={[0, 0.22, 2.32]} material={carMaterials.bumper} castShadow>
            <boxGeometry args={[2.05, 0.22, 0.12]} />
          </mesh>

          {/* Rear diffuser */}
          <mesh position={[0, 0.09, 2.35]} material={carMaterials.bodyDark}>
            <boxGeometry args={[1.6, 0.03, 0.06]} />
          </mesh>

          {/* Exhaust tips */}
          <mesh position={[-0.5, 0.12, 2.36]} material={carMaterials.chrome}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
          </mesh>
          <mesh position={[0.5, 0.12, 2.36]} material={carMaterials.chrome}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
          </mesh>

          {/* Headlight housings (FRONT = -Z) */}
          <mesh position={[0.72, 0.38, -2.29]} material={hlMat}>
            <boxGeometry args={[0.45, 0.12, 0.06]} />
          </mesh>
          <mesh position={[-0.72, 0.38, -2.29]} material={hlMat}>
            <boxGeometry args={[0.45, 0.12, 0.06]} />
          </mesh>

          {/* DRL strips */}
          <mesh position={[0.72, 0.3, -2.3]} material={carMaterials.accent}>
            <boxGeometry args={[0.4, 0.02, 0.02]} />
          </mesh>
          <mesh position={[-0.72, 0.3, -2.3]} material={carMaterials.accent}>
            <boxGeometry args={[0.4, 0.02, 0.02]} />
          </mesh>

          {/* Taillights (BACK = +Z) */}
          <mesh position={[0.72, 0.38, 2.28]} material={isBraking ? carMaterials.taillightBrake : carMaterials.taillight}>
            <boxGeometry args={[0.45, 0.1, 0.06]} />
          </mesh>
          <mesh position={[-0.72, 0.38, 2.28]} material={isBraking ? carMaterials.taillightBrake : carMaterials.taillight}>
            <boxGeometry args={[0.45, 0.1, 0.06]} />
          </mesh>

          {/* Tail light bar (connecting) */}
          <mesh position={[0, 0.38, 2.29]} material={carMaterials.taillight}>
            <boxGeometry args={[0.6, 0.03, 0.03]} />
          </mesh>

          {/* Side mirrors */}
          {[1, -1].map((side) => (
            <group key={`mirror-${side}`} position={[side * 1.05, 0.6, -0.5]}>
              <mesh material={carMaterials.mirror}>
                <boxGeometry args={[0.12, 0.04, 0.08]} />
              </mesh>
              <mesh position={[side * 0.08, 0, 0.02]} material={carMaterials.mirror}>
                <boxGeometry args={[0.08, 0.1, 0.12]} />
              </mesh>
              <mesh position={[side * 0.04, 0, 0.08]} material={carMaterials.mirrorGlass}>
                <planeGeometry args={[0.06, 0.08]} />
              </mesh>
            </group>
          ))}

          {/* Door lines - left */}
          <mesh position={[-1.01, 0.4, -0.2]} material={carMaterials.bodyDark}>
            <boxGeometry args={[0.005, 0.35, 0.01]} />
          </mesh>
          <mesh position={[-1.01, 0.4, 0.7]} material={carMaterials.bodyDark}>
            <boxGeometry args={[0.005, 0.35, 0.01]} />
          </mesh>

          {/* Door lines - right */}
          <mesh position={[1.01, 0.4, -0.2]} material={carMaterials.bodyDark}>
            <boxGeometry args={[0.005, 0.35, 0.01]} />
          </mesh>
          <mesh position={[1.01, 0.4, 0.7]} material={carMaterials.bodyDark}>
            <boxGeometry args={[0.005, 0.35, 0.01]} />
          </mesh>

          {/* Door handles */}
          {[1, -1].map((side) => (
            <mesh key={`handle-${side}`} position={[side * 1.02, 0.45, 0.25]} material={carMaterials.chrome}>
              <boxGeometry args={[0.02, 0.02, 0.1]} />
            </mesh>
          ))}
        </>
      )}

      {/* ===== WHEELS (always visible for physics) ===== */}
      {/* Rear wheels */}
      {[
        { pos: [1.0, 0, 1.35] as [number, number, number], idx: 0 },
        { pos: [-1.0, 0, 1.35] as [number, number, number], idx: 1 },
      ].map(({ pos, idx }) => (
        <group key={`rw-${idx}`} position={pos}>
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            ref={(el) => addWheelRef(el, idx)}
            castShadow
            material={carMaterials.tireBlack}
          >
            <cylinderGeometry args={[0.33, 0.33, 0.22, 12]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={carMaterials.wheelRim}>
            <cylinderGeometry args={[0.18, 0.18, 0.24, 10]} />
          </mesh>
          <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={carMaterials.chrome}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 8]} />
          </mesh>
        </group>
      ))}

      {/* Front wheels (with steering) */}
      {[
        { pos: [1.0, 0, -1.35] as [number, number, number], idx: 2, gIdx: 0 },
        { pos: [-1.0, 0, -1.35] as [number, number, number], idx: 3, gIdx: 1 },
      ].map(({ pos, idx, gIdx }) => (
        <group key={`fw-${idx}`} position={pos} ref={(el) => addFrontWheelGroupRef(el, gIdx)}>
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            ref={(el) => addWheelRef(el, idx)}
            castShadow
            material={carMaterials.tireBlack}
          >
            <cylinderGeometry args={[0.33, 0.33, 0.22, 12]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={carMaterials.wheelRim}>
            <cylinderGeometry args={[0.18, 0.18, 0.24, 10]} />
          </mesh>
          <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={carMaterials.chrome}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 8]} />
          </mesh>
        </group>
      ))}

      {/* Wheel arches (fender flares) */}
      {bodyVisible && [
        [1.0, 0.15, 1.35],
        [-1.0, 0.15, 1.35],
        [1.0, 0.15, -1.35],
        [-1.0, 0.15, -1.35],
      ].map((pos, i) => (
        <mesh key={`arch-${i}`} position={pos as [number, number, number]} material={carMaterials.bodyDark} castShadow>
          <boxGeometry args={[0.15, 0.4, 0.7]} />
        </mesh>
      ))}

      {/* Headlight SpotLights - pointing FORWARD (-Z) */}
      <Headlight 
        position={[0.7, 0.4, -2.3]} 
        targetPos={[0.7, -1, -25]} 
        on={headlightsOn}
      />
      <Headlight 
        position={[-0.7, 0.4, -2.3]} 
        targetPos={[-0.7, -1, -25]} 
        on={headlightsOn}
      />

      {/* Single forward fill light for headlights */}
      <pointLight
        position={[0, 0.5, -5]}
        intensity={headlightsOn ? 12 : 0}
        distance={35}
        color="#fff8e0"
        decay={2}
      />

      {/* Brake lights glow */}
      {isBraking && (
        <pointLight
          position={[0, 0.4, 2.5]}
          intensity={5}
          distance={8}
          color="#ff0000"
          decay={2}
        />
      )}
    </group>
  );
}
