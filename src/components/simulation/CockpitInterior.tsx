import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore, simFrameData } from '@/stores/simulationStore';

const severityColors: Record<string, string> = {
  critical: '#ff4444',
  warning: '#ffaa00',
  info: '#00ccff',
};

const typeLabels: Record<string, string> = {
  pothole: '🕳️ POTHOLE',
  debris: '🪨 DEBRIS',
  rock: '⛰️ ROCK',
  fallen_tree: '🌲 FALLEN TREE',
};

function DashboardScreen() {
  const { detectionAlerts, mode, timeOfDay } = useSimulationStore();
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const latestAlerts = detectionAlerts.slice(0, 3);

  // Poll speed at low rate
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplaySpeed(Math.round(simFrameData.speed));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      width: '220px',
      height: '130px',
      background: 'linear-gradient(180deg, #0a1628 0%, #0d1f3c 100%)',
      borderRadius: '4px',
      padding: '8px',
      fontFamily: "'JetBrains Mono', monospace",
      overflow: 'hidden',
      border: '1px solid rgba(0, 229, 255, 0.2)',
      boxShadow: 'inset 0 0 20px rgba(0, 229, 255, 0.05)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
        paddingBottom: '4px',
        marginBottom: '4px',
      }}>
        <span style={{ fontSize: '7px', color: '#00e5ff', letterSpacing: '1px' }}>
          AI DETECT v2.1
        </span>
        <span style={{ fontSize: '7px', color: '#666' }}>
          {timeOfDay === 'day' ? '☀️' : '🌙'} {mode.toUpperCase()}
        </span>
      </div>

      <div style={{ textAlign: 'center', padding: '2px 0' }}>
        <span style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: displaySpeed > 120 ? '#ff4444' : displaySpeed > 80 ? '#ffaa00' : '#00e5ff',
          textShadow: `0 0 10px ${displaySpeed > 120 ? 'rgba(255,68,68,0.5)' : 'rgba(0,229,255,0.5)'}`,
        }}>
          {displaySpeed}
        </span>
        <span style={{ fontSize: '7px', color: '#557788', marginLeft: '3px' }}>KM/H</span>
      </div>

      <div style={{
        borderTop: '1px solid rgba(0, 229, 255, 0.15)',
        paddingTop: '3px',
        marginTop: '2px',
      }}>
        {latestAlerts.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '7px', color: '#00cc66' }}>
              ✅ ROAD CLEAR
            </div>
            <div style={{
              width: '50px',
              height: '1px',
              margin: '3px auto',
              background: 'linear-gradient(90deg, transparent, #00cc66, transparent)',
            }} />
          </div>
        ) : (
          latestAlerts.map((alert, i) => (
            <div key={alert.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '1px 0',
              opacity: 1 - i * 0.25,
              fontSize: '7px',
            }}>
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: severityColors[alert.severity],
                boxShadow: `0 0 4px ${severityColors[alert.severity]}`,
                flexShrink: 0,
              }} />
              <span style={{ color: severityColors[alert.severity] }}>
                {typeLabels[alert.type] || '⚠️ HAZARD'}
              </span>
              <span style={{ color: '#446', marginLeft: 'auto' }}>
                {alert.distance}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CockpitInterior() {
  const { cameraView } = useSimulationStore();
  const steeringWheelRef = useRef<THREE.Group>(null);
  const currentSteerAngle = useRef(0);

  const dashMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    roughness: 0.85,
    metalness: 0.1,
  }), []);

  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a2a2a',
    roughness: 0.6,
    metalness: 0.3,
  }), []);

  const steeringMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#222222',
    roughness: 0.4,
    metalness: 0.5,
  }), []);

  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00e5ff',
    emissive: '#00e5ff',
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.6,
  }), []);

  const screenMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#111122',
    roughness: 0.2,
    metalness: 0.5,
  }), []);

  const mirrorGlassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#445566',
    metalness: 0.95,
    roughness: 0.05,
  }), []);

  useFrame((_, delta) => {
    if (!steeringWheelRef.current) return;
    const targetAngle = -simFrameData.steeringInput * 1.2;
    currentSteerAngle.current += (targetAngle - currentSteerAngle.current) * Math.min(delta * 10, 1);
    steeringWheelRef.current.rotation.z = currentSteerAngle.current;
  });

  if (cameraView !== 'first-person') return null;

  return (
    <group>
      {/* Dashboard main panel */}
      <mesh position={[0, 0.55, -1.6]} material={dashMat}>
        <boxGeometry args={[1.8, 0.35, 0.5]} />
      </mesh>

      {/* Dashboard top surface */}
      <mesh position={[0, 0.73, -1.5]} rotation={[-0.2, 0, 0]} material={dashMat}>
        <boxGeometry args={[1.85, 0.05, 0.7]} />
      </mesh>

      {/* Instrument cluster binnacle */}
      <mesh position={[0, 0.65, -1.45]} rotation={[-0.4, 0, 0]} material={trimMat}>
        <boxGeometry args={[0.6, 0.03, 0.35]} />
      </mesh>

      {/* Left dash accent strip */}
      <mesh position={[0, 0.375, -1.34]} material={accentMat}>
        <boxGeometry args={[1.82, 0.015, 0.02]} />
      </mesh>

      {/* Center console screen */}
      <mesh position={[0.05, 0.6, -1.33]} rotation={[-0.25, 0, 0]} material={screenMat}>
        <boxGeometry args={[0.42, 0.01, 0.28]} />
      </mesh>

      {/* HTML overlay for center screen */}
      <Html
        position={[0.05, 0.61, -1.32]}
        rotation={[-0.25, 0, 0]}
        transform
        scale={0.0018}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <DashboardScreen />
      </Html>

      {/* Steering column */}
      <mesh position={[0, 0.42, -1.15]} rotation={[-0.5, 0, 0]} material={trimMat}>
        <cylinderGeometry args={[0.03, 0.04, 0.5, 6]} />
      </mesh>

      {/* Steering wheel */}
      <group ref={steeringWheelRef} position={[0, 0.52, -1.0]} rotation={[-0.5, 0, 0]}>
        <mesh material={steeringMat}>
          <torusGeometry args={[0.17, 0.015, 8, 20]} />
        </mesh>
        <mesh material={trimMat}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 10]} />
        </mesh>
        <mesh position={[0, 0.011, 0]} material={accentMat}>
          <cylinderGeometry args={[0.025, 0.025, 0.005, 8]} />
        </mesh>
        {[0, Math.PI * 0.67, Math.PI * 1.33].map((angle, i) => (
          <mesh key={i} position={[Math.sin(angle) * 0.085, 0, Math.cos(angle) * 0.085]} rotation={[0, angle, 0]} material={steeringMat}>
            <boxGeometry args={[0.012, 0.012, 0.17]} />
          </mesh>
        ))}
      </group>

      {/* Left door panel */}
      <mesh position={[-0.88, 0.35, -0.6]} material={dashMat}>
        <boxGeometry args={[0.08, 0.5, 1.8]} />
      </mesh>

      {/* Right door panel */}
      <mesh position={[0.88, 0.35, -0.6]} material={dashMat}>
        <boxGeometry args={[0.08, 0.5, 1.8]} />
      </mesh>

      {/* Left armrest */}
      <mesh position={[-0.83, 0.42, -0.5]} material={trimMat}>
        <boxGeometry args={[0.08, 0.06, 0.35]} />
      </mesh>

      {/* Right armrest */}
      <mesh position={[0.83, 0.42, -0.5]} material={trimMat}>
        <boxGeometry args={[0.08, 0.06, 0.35]} />
      </mesh>

      {/* Center console (between seats) */}
      <mesh position={[0, 0.25, -0.3]} material={trimMat}>
        <boxGeometry args={[0.35, 0.2, 0.8]} />
      </mesh>

      {/* Gear shifter */}
      <mesh position={[0.08, 0.38, -0.55]} material={steeringMat}>
        <cylinderGeometry args={[0.015, 0.02, 0.12, 6]} />
      </mesh>
      <mesh position={[0.08, 0.45, -0.55]} material={steeringMat}>
        <sphereGeometry args={[0.025, 6, 6]} />
      </mesh>

      {/* A-pillar left */}
      <mesh position={[-0.85, 0.85, -1.2]} rotation={[0, 0.15, -0.2]} material={dashMat}>
        <boxGeometry args={[0.06, 0.55, 0.06]} />
      </mesh>

      {/* A-pillar right */}
      <mesh position={[0.85, 0.85, -1.2]} rotation={[0, -0.15, 0.2]} material={dashMat}>
        <boxGeometry args={[0.06, 0.55, 0.06]} />
      </mesh>

      {/* Rearview mirror */}
      <group position={[0, 0.95, -1.3]}>
        <mesh material={trimMat}>
          <boxGeometry args={[0.02, 0.06, 0.02]} />
        </mesh>
        <mesh position={[0, -0.06, 0]} material={dashMat}>
          <boxGeometry args={[0.22, 0.06, 0.02]} />
        </mesh>
        <mesh position={[0, -0.06, 0.011]} material={mirrorGlassMat}>
          <planeGeometry args={[0.2, 0.05]} />
        </mesh>
      </group>

      {/* Ambient cockpit light */}
      <pointLight position={[0, 0.8, -0.8]} intensity={0.5} distance={3} color="#334466" decay={2} />
      <pointLight position={[0.05, 0.6, -1.3]} intensity={0.3} distance={1} color="#00e5ff" decay={2} />
    </group>
  );
}
