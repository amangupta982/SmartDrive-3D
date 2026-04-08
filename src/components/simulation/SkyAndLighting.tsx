import { useMemo, useRef } from 'react';
import { Sky, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '@/stores/simulationStore';

export function SkyAndLighting() {
  const { timeOfDay, mode } = useSimulationStore();
  const isNight = timeOfDay === 'night';
  const moonRef = useRef<THREE.Mesh>(null);

  const sunPosition = useMemo((): [number, number, number] => {
    if (isNight) return [0, -1, 0];
    return [100, 60, 50];
  }, [isNight]);

  // Gentle moon rotation
  useFrame((state) => {
    if (moonRef.current && isNight) {
      moonRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.02) * 200;
      moonRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.02) * 200;
    }
  });

  return (
    <>
      {/* Day sky */}
      {!isNight && (
        <Sky
          distance={450000}
          sunPosition={sunPosition}
          inclination={0.5}
          azimuth={0.25}
          rayleigh={1.5}
          turbidity={8}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      )}

      {/* Night sky */}
      {isNight && (
        <>
          <color attach="background" args={['#060d1f']} />
          <Stars radius={300} depth={50} count={2000} factor={4} saturation={0.2} fade speed={0.5} />
          
          {/* Moon */}
          <mesh ref={moonRef} position={[100, 120, 100]}>
            <sphereGeometry args={[8, 16, 16]} />
            <meshBasicMaterial color="#dde8f0" />
          </mesh>
          
          {/* Moonlight */}
          <directionalLight
            position={[100, 120, 100]}
            intensity={0.25}
            color="#8899bb"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={100}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
          />
        </>
      )}

      {/* Ambient light - city night needs more ambient for visibility */}
      <ambientLight 
        intensity={isNight ? (mode === 'city' ? 0.2 : 0.12) : 0.5} 
        color={isNight ? '#6688bb' : '#ffffff'} 
      />

      {/* Main directional (sun) */}
      {!isNight && (
        <directionalLight
          position={sunPosition}
          intensity={1.5}
          color="#fff5e0"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={150}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />
      )}

      {/* Hemisphere for natural fill - city night gets warm ground fill from street lights */}
      <hemisphereLight 
        intensity={isNight ? (mode === 'city' ? 0.18 : 0.1) : 0.4} 
        color={isNight ? '#334466' : '#87CEEB'} 
        groundColor={isNight ? (mode === 'city' ? '#2a2015' : '#0a0a15') : mode === 'city' ? '#555555' : '#3a5a2a'} 
      />

      {/* Fog */}
      <fog attach="fog" args={[isNight ? '#060d1f' : '#c8d8e8', isNight ? 30 : 50, isNight ? 200 : 300]} />
    </>
  );
}
