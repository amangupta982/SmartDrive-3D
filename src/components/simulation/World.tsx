import { sendLoRaAlert } from '../../utils/loraService';
import { sharedActiveChunks } from '@/stores/sharedChunks';
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore, simFrameData, EnvironmentMode } from '@/stores/simulationStore';

interface WorldProps {
  obstacles: React.MutableRefObject<Array<{ position: THREE.Vector3; radius: number }>>;
  currentSpeed?: number;
}

interface Chunk {
  z: number;
  scenery: Array<{
    type: 'building' | 'house' | 'tree' | 'rock' | 'pothole' | 'debris' | 'vehicle' | 'streetlight' | 'fence' | 'bush' | 'grass_patch' | 'traffic_light' | 'sign' | 'guardrail';
    position: [number, number, number];
    scale: [number, number, number];
    color: string;
    color2?: string;
    isObstacle: boolean;
    radius: number;
    rotation?: number;
  }>;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function generateChunkScenery(chunkZ: number, mode: EnvironmentMode): Chunk['scenery'] {
  const items: Chunk['scenery'] = [];
  const seed = Math.floor(chunkZ / 100);

  if (mode === 'city') {
    // Buildings on both sides - more variety
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const r = seededRandom(seed * 100 + i);
      const height = 6 + r * 25;
      const width = 3 + seededRandom(seed * 200 + i) * 5;
      const depth = 3 + seededRandom(seed * 300 + i) * 5;
      const z = chunkZ + (i / 10) * 100;
      const x = side * (9 + seededRandom(seed * 400 + i) * 10);
      
      const colors = ['#556677', '#4a5a6a', '#667788', '#3d4d5d', '#788899', '#8899aa', '#5c6c7c'];
      const color2Options = ['#445566', '#3a4a5a', '#556677', '#2d3d4d'];
      items.push({
        type: 'building',
        position: [x, height / 2, z],
        scale: [width, height, depth],
        color: colors[Math.floor(seededRandom(seed * 500 + i) * colors.length)],
        color2: color2Options[Math.floor(seededRandom(seed * 550 + i) * color2Options.length)],
        isObstacle: true,
        radius: Math.max(width, depth) / 2,
      });
    }

    // Sidewalks/curbs
    items.push({
      type: 'guardrail',
      position: [5.5, 0.1, chunkZ + 50],
      scale: [1.5, 0.15, 100],
      color: '#999999',
      isObstacle: false,
      radius: 0,
    });
    items.push({
      type: 'guardrail',
      position: [-5.5, 0.1, chunkZ + 50],
      scale: [1.5, 0.15, 100],
      color: '#999999',
      isObstacle: false,
      radius: 0,
    });

    // Traffic lights
    if (seededRandom(seed * 550) > 0.5) {
      const tlZ = chunkZ + seededRandom(seed * 551) * 60 + 20;
      items.push({
        type: 'traffic_light',
        position: [5.2, 0, tlZ],
        scale: [0.3, 4.5, 0.3],
        color: '#444444',
        isObstacle: true,
        radius: 0.3,
      });
    }

    // Traffic vehicles (parked on sides)
    for (let i = 0; i < 4; i++) {
      const r = seededRandom(seed * 600 + i);
      if (r > 0.4) {
        const side = r > 0.7 ? 3.8 : -3.8;
        const vehicleColors = ['#cc3333', '#3333cc', '#33cc33', '#cccc33', '#cc6633', '#9933cc', '#333333', '#cccccc'];
        items.push({
          type: 'vehicle',
          position: [side, 0.5, chunkZ + i * 25 + 10],
          scale: [1.8, 1, 4],
          color: vehicleColors[Math.floor(r * vehicleColors.length)],
          isObstacle: true,
          radius: 2,
        });
      }
    }

    // Road hazards - potholes
    if (seededRandom(seed * 700) > 0.5) {
      const hz = chunkZ + seededRandom(seed * 701) * 80 + 10;
      items.push({
        type: 'pothole',
        position: [seededRandom(seed * 702) * 4 - 2, 0.02, hz],
        scale: [1.5 + seededRandom(seed * 703) * 0.8, 0.15, 1.5 + seededRandom(seed * 704) * 0.8],
        color: '#222222',
        color2: '#1a1a1a',
        isObstacle: false,
        radius: 0,
      });
    }

    // Debris
    if (seededRandom(seed * 800) > 0.6) {
      items.push({
        type: 'debris',
        position: [seededRandom(seed * 801) * 3 - 1.5, 0.2, chunkZ + 50],
        scale: [0.5, 0.4, 0.5],
        color: '#886644',
        isObstacle: true,
        radius: 0.5,
      });
    }

    // Bushes/trees along sidewalks
    for (let i = 0; i < 4; i++) {
      const r = seededRandom(seed * 900 + i);
      if (r > 0.3) {
        const side = i % 2 === 0 ? 1 : -1;
        items.push({
          type: 'bush',
          position: [side * 6.8, 0.4, chunkZ + i * 25 + r * 10],
          scale: [0.8 + r * 0.5, 0.6 + r * 0.4, 0.8 + r * 0.5],
          color: '#3a6b2a',
          isObstacle: false,
          radius: 0,
        });
      }
    }

  } else if (mode === 'village') {
    // Rural houses - more detailed
    for (let i = 0; i < 5; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const r = seededRandom(seed * 100 + i);
      const z = chunkZ + (i / 5) * 100 + r * 15;
      const houseColors = ['#aa8866', '#997755', '#bb9977', '#cc8855', '#8a7050', '#b89070'];
      items.push({
        type: 'house',
        position: [side * (7 + r * 6), 1.5, z],
        scale: [3.5, 3, 4.5],
        color: houseColors[Math.floor(r * houseColors.length)],
        color2: '#884422',
        isObstacle: true,
        radius: 2.5,
      });
    }

    // Fences along road
    for (let i = 0; i < 3; i++) {
      const r = seededRandom(seed * 150 + i);
      if (r > 0.4) {
        const side = i % 2 === 0 ? 1 : -1;
        items.push({
          type: 'fence',
          position: [side * 4.5, 0.4, chunkZ + i * 30 + 15],
          scale: [0.1, 0.8, 8],
          color: '#8a6a40',
          isObstacle: false,
          radius: 0,
        });
      }
    }

    // Trees
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const r = seededRandom(seed * 200 + i);
      const treeColors = ['#3a6b2a', '#447733', '#2d5a1e', '#4a7a3a', '#558844'];
      items.push({
        type: 'tree',
        position: [side * (5 + r * 12), 0, chunkZ + i * 12 + r * 8],
        scale: [1.2, 3 + r * 3, 1.2],
        color: treeColors[Math.floor(r * treeColors.length)],
        isObstacle: true,
        radius: 0.8,
      });
    }

    // Grass patches
    for (let i = 0; i < 6; i++) {
      const r = seededRandom(seed * 250 + i);
      const side = i % 2 === 0 ? 1 : -1;
      items.push({
        type: 'grass_patch',
        position: [side * (3.5 + r * 4), 0.05, chunkZ + i * 16 + r * 5],
        scale: [1 + r * 2, 0.1, 1 + r * 2],
        color: '#5a8a3a',
        isObstacle: false,
        radius: 0,
      });
    }

    // Rocks on road
    if (seededRandom(seed * 300) > 0.5) {
      items.push({
        type: 'rock',
        position: [seededRandom(seed * 301) * 4 - 2, 0.3, chunkZ + 40],
        scale: [0.6, 0.5, 0.6],
        color: '#888888',
        isObstacle: true,
        radius: 0.5,
      });
    }

    // Potholes
    if (seededRandom(seed * 400) > 0.35) {
      items.push({
        type: 'pothole',
        position: [seededRandom(seed * 401) * 3 - 1.5, 0.02, chunkZ + 70],
        scale: [2, 0.15, 2],
        color: '#3a3a28',
        color2: '#2a2a1a',
        isObstacle: false,
        radius: 0,
      });
    }

  } else {
    // Jungle - dense and lush
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const r = seededRandom(seed * 100 + i);
      const offset = 4 + r * 10;
      const treeColors = ['#1e4a12', '#2d5a1e', '#3a6b2a', '#1a4010', '#2a5a20', '#3d7030'];
      items.push({
        type: 'tree',
        position: [side * offset, 0, chunkZ + i * 6 + r * 4],
        scale: [1.5 + r * 1.5, 5 + r * 6, 1.5 + r * 1.5],
        color: treeColors[Math.floor(r * treeColors.length)],
        isObstacle: true,
        radius: 1.2,
      });
    }

    // Undergrowth / bushes
    for (let i = 0; i < 10; i++) {
      const r = seededRandom(seed * 150 + i);
      const side = r > 0.5 ? 1 : -1;
      items.push({
        type: 'bush',
        position: [side * (3.5 + r * 6), 0.3, chunkZ + i * 10 + r * 5],
        scale: [1 + r * 1.2, 0.5 + r * 0.6, 1 + r * 1.2],
        color: '#2d5a1e',
        isObstacle: false,
        radius: 0,
      });
    }

    // Fallen tree (road blockage)
    if (seededRandom(seed * 200) > 0.65) {
      items.push({
        type: 'debris',
        position: [seededRandom(seed * 201) * 2 - 1, 0.4, chunkZ + 60],
        scale: [5, 0.6, 0.6],
        color: '#4a2a0a',
        isObstacle: true,
        radius: 2.5,
      });
    }

    // Rocks / landslide
    if (seededRandom(seed * 300) > 0.4) {
      const rz = chunkZ + seededRandom(seed * 301) * 60 + 20;
      for (let j = 0; j < 4; j++) {
        items.push({
          type: 'rock',
          position: [seededRandom(seed * 310 + j) * 3.5 - 1.5, 0.3 + j * 0.15, rz + j * 0.5],
          scale: [0.4 + seededRandom(seed * 320 + j) * 0.6, 0.3 + seededRandom(seed * 330 + j) * 0.4, 0.5],
          color: '#666655',
          isObstacle: true,
          radius: 0.5,
        });
      }
    }

    // Pothole
    if (seededRandom(seed * 400) > 0.25) {
      items.push({
        type: 'pothole',
        position: [seededRandom(seed * 401) * 3 - 1.5, 0.02, chunkZ + 30],
        scale: [1.8, 0.15, 1.8],
        color: '#2a2a1a',
        color2: '#1a1a0a',
        isObstacle: false,
        radius: 0,
      });
    }

    // Moss-covered rocks (decorative)
    for (let i = 0; i < 3; i++) {
      const r = seededRandom(seed * 500 + i);
      if (r > 0.5) {
        const side = i % 2 === 0 ? 1 : -1;
        items.push({
          type: 'rock',
          position: [side * (3.5 + r * 5), 0.25, chunkZ + i * 30 + r * 10],
          scale: [0.8 + r * 0.5, 0.5 + r * 0.3, 0.7 + r * 0.4],
          color: '#4a5a3a',
          isObstacle: false,
          radius: 0,
        });
      }
    }
  }

  return items;
}

function SceneryItem({ item, isNight, mode }: { 
  item: Chunk['scenery'][0]; 
  isNight: boolean;
  mode: EnvironmentMode;
}) {

  if (item.type === 'tree') {
    const trunkHeight = item.scale[1] * 0.35;
    const canopyRadius = item.scale[0] * 1.5;
    const isJungle = mode === 'jungle';
    
    return (
      <group position={item.position}>
        {/* Trunk */}
        <mesh position={[0, trunkHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.22, trunkHeight, 6]} />
          <meshStandardMaterial color={isJungle ? '#3a2510' : '#5a3a1a'} roughness={0.95} />
        </mesh>
        
        {/* Roots (jungle trees) */}
        {isJungle && (
          <>
            <mesh position={[0.15, 0.1, 0.1]} rotation={[0, 0.5, 0.4]}>
              <cylinderGeometry args={[0.03, 0.06, 0.5, 4]} />
              <meshStandardMaterial color="#3a2510" roughness={0.95} />
            </mesh>
            <mesh position={[-0.12, 0.1, -0.08]} rotation={[0, -0.8, -0.35]}>
              <cylinderGeometry args={[0.03, 0.05, 0.4, 4]} />
              <meshStandardMaterial color="#3a2510" roughness={0.95} />
            </mesh>
          </>
        )}
        
        {/* Multi-layered foliage */}
        <mesh position={[0, item.scale[1] * 0.75, 0]} castShadow>
          <coneGeometry args={[canopyRadius, item.scale[1] * 0.5, 8]} />
          <meshStandardMaterial color={item.color} roughness={0.85} />
        </mesh>
        <mesh position={[0, item.scale[1] * 0.6, 0]} castShadow>
          <coneGeometry args={[canopyRadius * 1.2, item.scale[1] * 0.4, 8]} />
          <meshStandardMaterial color={item.color} roughness={0.85} />
        </mesh>
        {isJungle && (
          <mesh position={[0, item.scale[1] * 0.85, 0]} castShadow>
            <coneGeometry args={[canopyRadius * 0.7, item.scale[1] * 0.3, 6]} />
            <meshStandardMaterial color={item.color} roughness={0.85} />
          </mesh>
        )}
        
        {/* Canopy sphere for fuller trees (village/jungle) */}
        {(mode === 'village' || mode === 'jungle') && item.scale[1] > 4 && (
          <mesh position={[0, item.scale[1] * 0.7, 0]} castShadow>
            <sphereGeometry args={[canopyRadius * 0.9, 8, 6]} />
            <meshStandardMaterial color={item.color} roughness={0.9} />
          </mesh>
        )}
      </group>
    );
  }

  if (item.type === 'bush') {
    return (
      <group position={item.position}>
        <mesh castShadow>
          <sphereGeometry args={[item.scale[0] * 0.5, 6, 5]} />
          <meshStandardMaterial color={item.color} roughness={0.9} />
        </mesh>
        <mesh position={[item.scale[0] * 0.2, -0.1, item.scale[2] * 0.15]} castShadow>
          <sphereGeometry args={[item.scale[0] * 0.35, 6, 5]} />
          <meshStandardMaterial color={item.color} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (item.type === 'grass_patch') {
    return (
      <mesh position={item.position} rotation={[-Math.PI / 2, 0, seededRandom(item.position[2]) * Math.PI]}>
        <circleGeometry args={[item.scale[0] * 0.6, 6]} />
        <meshStandardMaterial color={item.color} roughness={1} />
      </mesh>
    );
  }

  if (item.type === 'fence') {
    return (
      <group position={item.position}>
        {/* Main rail */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[item.scale[0], 0.06, item.scale[2]]} />
          <meshStandardMaterial color={item.color} roughness={0.9} />
        </mesh>
        {/* Top rail */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[item.scale[0], 0.04, item.scale[2]]} />
          <meshStandardMaterial color={item.color} roughness={0.9} />
        </mesh>
        {/* Posts */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`fp-${i}`} position={[0, 0.2, -item.scale[2] / 2 + (i / 4) * item.scale[2]]}>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color={item.color} roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }

  if (item.type === 'house') {
    return (
      <group position={item.position}>
        {/* Walls */}
        <mesh castShadow>
          <boxGeometry args={item.scale} />
          <meshStandardMaterial color={item.color} roughness={0.8} />
        </mesh>
        
        {/* Roof */}
        <mesh position={[0, item.scale[1] / 2 + 0.9, 0]} castShadow>
          <coneGeometry args={[item.scale[0] * 0.85, 1.8, 4]} />
          <meshStandardMaterial color={item.color2 || '#884422'} roughness={0.85} />
        </mesh>
        
        {/* Chimney */}
        <mesh position={[item.scale[0] * 0.25, item.scale[1] / 2 + 1.5, 0]} castShadow>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <meshStandardMaterial color="#776655" roughness={0.9} />
        </mesh>
        
        {/* Door */}
        <mesh position={[0, -0.5, item.scale[2] / 2 + 0.01]}>
          <boxGeometry args={[0.6, 1.2, 0.02]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
        </mesh>
        
        {/* Windows */}
        {[-1, 1].map((side) => (
          <mesh key={`win-${side}`} position={[side * 0.8, 0.3, item.scale[2] / 2 + 0.01]}>
            <planeGeometry args={[0.5, 0.5]} />
            <meshStandardMaterial 
              color={isNight ? '#ffdd88' : '#88bbcc'} 
              emissive={isNight ? '#ffcc44' : '#000000'} 
              emissiveIntensity={isNight ? 0.8 : 0} 
              roughness={0.2} 
            />
          </mesh>
        ))}
        
        {/* Window on side */}
        <mesh position={[item.scale[0] / 2 + 0.01, 0.3, 0]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshStandardMaterial 
            color={isNight ? '#ffdd88' : '#88bbcc'} 
            emissive={isNight ? '#ffcc44' : '#000000'} 
            emissiveIntensity={isNight ? 0.6 : 0} 
            roughness={0.2} 
          />
        </mesh>
        
        {/* Front step */}
        <mesh position={[0, -item.scale[1] / 2 + 0.1, item.scale[2] / 2 + 0.2]}>
          <boxGeometry args={[1, 0.15, 0.4]} />
          <meshStandardMaterial color="#888877" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (item.type === 'building') {
    const windowRows = Math.floor(item.scale[1] / 2.5);
    const windowCols = Math.floor(item.scale[0] / 1.5);
    
    return (
      <group position={item.position}>
        {/* Main structure */}
        <mesh castShadow>
          <boxGeometry args={item.scale} />
          <meshStandardMaterial color={item.color} roughness={0.6} metalness={0.2} />
        </mesh>
        
        {/* Secondary block (architectural detail) */}
        {item.scale[1] > 12 && (
          <mesh position={[0, item.scale[1] * 0.1, 0]} castShadow>
            <boxGeometry args={[item.scale[0] * 0.9, item.scale[1] * 0.8, item.scale[2] * 0.9]} />
            <meshStandardMaterial color={item.color2 || item.color} roughness={0.5} metalness={0.3} />
          </mesh>
        )}
        
        {/* Roof edge */}
        <mesh position={[0, item.scale[1] / 2, 0]}>
          <boxGeometry args={[item.scale[0] + 0.2, 0.1, item.scale[2] + 0.2]} />
          <meshStandardMaterial color="#555555" roughness={0.5} metalness={0.4} />
        </mesh>
        
        {/* Windows grid on front face */}
        {Array.from({ length: Math.min(windowRows, 8) }).map((_, row) =>
          Array.from({ length: Math.min(windowCols, 4) }).map((_, col) => {
            const yr = seededRandom(row * 10 + col + item.position[2] * 7);
            const isLit = isNight && yr > 0.4;
            return (
              <mesh 
                key={`w-${row}-${col}`}
                position={[
                  (col - (Math.min(windowCols, 4) - 1) / 2) * 1.3,
                  (row - (Math.min(windowRows, 8) - 1) / 2) * 2.2,
                  item.scale[2] / 2 + 0.01
                ]}
              >
                <planeGeometry args={[0.8, 1.2]} />
                <meshStandardMaterial 
                  color={isLit ? '#ffdd88' : '#334466'}
                  emissive={isLit ? '#ffcc44' : '#000000'}
                  emissiveIntensity={isLit ? 0.5 : 0}
                  metalness={0.8}
                  roughness={0.1}
                  transparent={!isLit}
                  opacity={isLit ? 1 : 0.8}
                />
              </mesh>
            );
          })
        )}
        
        {/* Ground floor entrance */}
        <mesh position={[0, -item.scale[1] / 2 + 1, item.scale[2] / 2 + 0.01]}>
          <planeGeometry args={[1.5, 2]} />
          <meshStandardMaterial color="#2a2a3a" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (item.type === 'traffic_light') {
    return (
      <group position={item.position}>
        {/* Pole */}
        <mesh position={[0, 2.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 4.5, 8]} />
          <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Light housing */}
        <mesh position={[0, 4.2, 0]} castShadow>
          <boxGeometry args={[0.25, 0.7, 0.2]} />
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Red */}
        <mesh position={[0, 4.4, 0.11]}>
          <circleGeometry args={[0.06, 8]} />
          <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={0.5} />
        </mesh>
        {/* Yellow */}
        <mesh position={[0, 4.2, 0.11]}>
          <circleGeometry args={[0.06, 8]} />
          <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.2} />
        </mesh>
        {/* Green */}
        <mesh position={[0, 4.0, 0.11]}>
          <circleGeometry args={[0.06, 8]} />
          <meshStandardMaterial color="#00cc44" emissive="#00cc44" emissiveIntensity={0.3} />
        </mesh>
      </group>
    );
  }

  if (item.type === 'guardrail') {
    return (
      <mesh position={item.position} castShadow receiveShadow>
        <boxGeometry args={item.scale} />
        <meshStandardMaterial color={item.color} roughness={0.8} />
      </mesh>
    );
  }

  if (item.type === 'vehicle') {
    return (
      <group position={item.position}>
        {/* Body */}
        <mesh castShadow>
          <boxGeometry args={item.scale} />
          <meshStandardMaterial color={item.color} metalness={0.75} roughness={0.25} />
        </mesh>
        {/* Cabin */}
        <mesh position={[0, 0.55, -0.2]} castShadow>
          <boxGeometry args={[item.scale[0] * 0.82, 0.5, item.scale[2] * 0.5]} />
          <meshStandardMaterial color={item.color} metalness={0.75} roughness={0.25} />
        </mesh>
        {/* Windshield */}
        <mesh position={[0, 0.55, -0.85]}>
          <boxGeometry args={[item.scale[0] * 0.75, 0.4, 0.02]} />
          <meshStandardMaterial color="#88bbcc" transparent opacity={0.5} metalness={0.9} roughness={0.05} />
        </mesh>
        {/* Wheels */}
        {[[-0.8, -0.3, 1], [0.8, -0.3, 1], [-0.8, -0.3, -1], [0.8, -0.3, -1]].map((pos, i) => (
          <mesh key={`vw-${i}`} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.12, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        ))}
        {/* Taillights */}
        <mesh position={[0.6, 0.1, 2]}>
          <boxGeometry args={[0.25, 0.08, 0.02]} />
          <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[-0.6, 0.1, 2]}>
          <boxGeometry args={[0.25, 0.08, 0.02]} />
          <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.3} />
        </mesh>
      </group>
    );
  }

  if (item.type === 'pothole') {
    return (
      <group position={item.position}>
        {/* Outer crater ring (cracked edges) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[item.scale[0] / 2 - 0.1, item.scale[0] / 2 + 0.15, 16]} />
          <meshStandardMaterial color="#4a4a3a" roughness={1} />
        </mesh>
        {/* Pothole surface (darker, depressed) */}
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[item.scale[0] / 2 - 0.1, 12]} />
          <meshStandardMaterial color={item.color2 || item.color} roughness={1} />
        </mesh>
        {/* Depth shadow */}
        <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[item.scale[0] / 2 - 0.2, 10]} />
          <meshStandardMaterial color="#0a0a0a" roughness={1} />
        </mesh>
        {/* Crack lines radiating out */}
        {[0, 0.8, 1.6, 2.4, 3.2, 4].map((angle, i) => (
          <mesh key={`crack-${i}`} position={[
            Math.cos(angle) * (item.scale[0] / 2 + 0.1), 
            0.015, 
            Math.sin(angle) * (item.scale[0] / 2 + 0.1)
          ]} rotation={[-Math.PI / 2, 0, angle]}>
            <planeGeometry args={[0.02, 0.3]} />
            <meshStandardMaterial color="#3a3a2a" roughness={1} />
          </mesh>
        ))}
        {/* Warning marking (faded paint) */}
        <mesh position={[0, 0.025, -item.scale[0] / 2 - 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.08]} />
          <meshStandardMaterial color="#ffaa00" roughness={0.8} transparent opacity={0.4} />
        </mesh>
      </group>
    );
  }

  // Rock
  if (item.type === 'rock') {
    return (
      <group position={item.position}>
        <mesh castShadow>
          <dodecahedronGeometry args={[item.scale[0], 1]} />
          <meshStandardMaterial color={item.color} roughness={0.92} />
        </mesh>
        {/* Smaller detail rocks */}
        <mesh position={[item.scale[0] * 0.6, -item.scale[1] * 0.3, 0.15]} castShadow>
          <dodecahedronGeometry args={[item.scale[0] * 0.3, 0]} />
          <meshStandardMaterial color={item.color} roughness={0.95} />
        </mesh>
      </group>
    );
  }

  // Debris
  if (item.type === 'debris') {
    return (
      <group position={item.position}>
        {/* Main debris piece */}
        <mesh castShadow>
          <boxGeometry args={item.scale} />
          <meshStandardMaterial color={item.color} roughness={0.9} />
        </mesh>
        {/* Scattered fragments */}
        <mesh position={[0.4, -0.1, 0.3]} rotation={[0.3, 0.5, 0.2]} castShadow>
          <boxGeometry args={[item.scale[0] * 0.2, item.scale[1] * 0.3, item.scale[2] * 0.25]} />
          <meshStandardMaterial color={item.color} roughness={0.9} />
        </mesh>
        <mesh position={[-0.3, -0.05, -0.2]} rotation={[-0.2, 0.8, 0.1]} castShadow>
          <dodecahedronGeometry args={[item.scale[0] * 0.15, 0]} />
          <meshStandardMaterial color={item.color} roughness={0.95} />
        </mesh>
        <mesh position={[0.15, -0.15, -0.35]} castShadow>
          <dodecahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color={item.color} roughness={0.95} />
        </mesh>
      </group>
    );
  }

  // Fallback
  const mat = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.7 });
  return (
    <mesh position={item.position} castShadow material={mat}>
      <boxGeometry args={item.scale} />
    </mesh>
  );
}

function RoadChunk({ z, mode }: { z: number; mode: EnvironmentMode }) {
  const roadWidth = mode === 'city' ? 10 : mode === 'village' ? 6 : 7;
  const roadColor = mode === 'city' ? '#3a3a3a' : mode === 'village' ? '#5a5a4a' : '#4a4a38';
  
  return (
    <group>
      {/* Road surface */}
      <mesh position={[0, 0.01, z + 50]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roadWidth, 100]} />
        <meshStandardMaterial color={roadColor} roughness={0.92} />
      </mesh>

      {/* Road shoulder/edge texture */}
      {mode !== 'city' && (
        <>
          <mesh position={[roadWidth / 2 + 0.3, 0.005, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 100]} />
            <meshStandardMaterial color={mode === 'village' ? '#7a7a6a' : '#5a5a4a'} roughness={1} />
          </mesh>
          <mesh position={[-roadWidth / 2 - 0.3, 0.005, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 100]} />
            <meshStandardMaterial color={mode === 'village' ? '#7a7a6a' : '#5a5a4a'} roughness={1} />
          </mesh>
        </>
      )}

      {/* City lane markings */}
      {mode === 'city' && (
        <>
          {/* Center dashed line */}
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={`cl-${i}`} position={[0, 0.02, z + i * 8 + 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.15, 4]} />
              <meshStandardMaterial color="#dddd44" roughness={0.5} />
            </mesh>
          ))}
          
          {/* Side lines */}
          <mesh position={[roadWidth / 2 - 0.3, 0.02, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 100]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
          <mesh position={[-roadWidth / 2 + 0.3, 0.02, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 100]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>

          {/* Crosswalk */}
          {seededRandom(z * 0.01) > 0.6 && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <mesh key={`cw-${i}`} position={[i * 1.2 - 3, 0.025, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.5, 3]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.5} transparent opacity={0.8} />
                </mesh>
              ))}
            </>
          )}

          {/* Sidewalk surface */}
          <mesh position={[roadWidth / 2 + 1.5, 0.16, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2, 100]} />
            <meshStandardMaterial color="#888888" roughness={0.85} />
          </mesh>
          <mesh position={[-roadWidth / 2 - 1.5, 0.16, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2, 100]} />
            <meshStandardMaterial color="#888888" roughness={0.85} />
          </mesh>
        </>
      )}

      {/* Village road edges */}
      {mode === 'village' && (
        <>
          <mesh position={[roadWidth / 2, 0.05, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 100]} />
            <meshStandardMaterial color="#887766" roughness={1} />
          </mesh>
          <mesh position={[-roadWidth / 2, 0.05, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 100]} />
            <meshStandardMaterial color="#887766" roughness={1} />
          </mesh>
          
          {/* Occasional center dashes for village */}
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={`vcl-${i}`} position={[0, 0.02, z + i * 20 + 5]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.1, 5]} />
              <meshStandardMaterial color="#aaaaaa" roughness={0.7} transparent opacity={0.5} />
            </mesh>
          ))}
        </>
      )}

      {/* Jungle - dirt road markings (tire tracks) */}
      {mode === 'jungle' && (
        <>
          <mesh position={[1.2, 0.012, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.6, 100]} />
            <meshStandardMaterial color="#3a3a2a" roughness={1} transparent opacity={0.3} />
          </mesh>
          <mesh position={[-1.2, 0.012, z + 50]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.6, 100]} />
            <meshStandardMaterial color="#3a3a2a" roughness={1} transparent opacity={0.3} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ✅ AI road hazard detection
function checkRoadDamage(
  carPos: [number, number, number],
  currentSpeed: number,
  currentMode: EnvironmentMode,
  chunks: Chunk[],
  reportedDamage: React.MutableRefObject<Set<string>>
) {
  const carPosition = new THREE.Vector3(...carPos);

  for (const chunk of chunks) {
    for (const item of chunk.scenery) {

      // Detect pothole, debris, and rock
      if (item.type === 'pothole' || item.type === 'debris' || item.type === 'rock') {

        const itemPosition = new THREE.Vector3(...item.position);
        const distance = carPosition.distanceTo(itemPosition);

        // ✅ Detect earlier — extended 55m range
        if (distance < 55) {

          const damageKey = `${item.position[0].toFixed(1)}-${item.position[2].toFixed(1)}`;

          if (!reportedDamage.current.has(damageKey)) {

            reportedDamage.current.add(damageKey);

            // Send LoRa alert
            sendLoRaAlert({
              mode: currentMode,
              location: `${Math.abs(item.position[2]).toFixed(1)}m`,
              speed: Math.abs(currentSpeed),
              type: item.type as 'pothole' | 'debris' | 'rock',
              distance: `${distance.toFixed(0)}m ahead`,
            });

            console.log(`🚨 Road damage detected: ${item.type} at ${damageKey}`);
          }
        }
      }
    }
  }
}

export function World({ obstacles, currentSpeed = 50 }: WorldProps) {
  const { mode, timeOfDay } = useSimulationStore();
  const chunksRef = useRef<Map<number, Chunk>>(new Map());
  const isNight = timeOfDay === 'night';
  const reportedDamageRef = useRef(new Set<string>());
  const [chunkKey, setChunkKey] = useState(0);
  const lastChunkIdx = useRef(0);
  const cachedObs = useRef<Array<{ position: THREE.Vector3; radius: number }>>([]);
  const obsNeedsUpdate = useRef(true);

  // Regenerate when mode changes
  useEffect(() => {
    chunksRef.current.clear();
    reportedDamageRef.current.clear();
    obsNeedsUpdate.current = true;
    setChunkKey(k => k + 1);
  }, [mode]);

  // Generate chunks around car - only updates when crossing chunk boundary
  const activeChunks = useMemo(() => {
    const carZ = simFrameData.carPosition[2];
    const chunkSize = 100;
    const currentChunk = Math.floor(carZ / chunkSize);
    const range = 4;
    const chunks: Chunk[] = [];

    for (let i = currentChunk - 2; i <= currentChunk + range; i++) {
      const chunkZ = i * chunkSize;
      if (!chunksRef.current.has(chunkZ)) {
        chunksRef.current.set(chunkZ, {
          z: chunkZ,
          scenery: generateChunkScenery(chunkZ, mode),
        });
        obsNeedsUpdate.current = true;
      }
      chunks.push(chunksRef.current.get(chunkZ)!);
    }

    for (const [key] of chunksRef.current) {
      if (key < (currentChunk - 3) * chunkSize || key > (currentChunk + range + 1) * chunkSize) {
        chunksRef.current.delete(key);
        obsNeedsUpdate.current = true;
      }
    }

    return chunks;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkKey, mode]);

  // Per-frame: update chunk index, obstacles, and damage detection
  useFrame(() => {
    // Check if car moved to a new chunk
    const currentChunk = Math.floor(simFrameData.carPosition[2] / 100);
    if (currentChunk !== lastChunkIdx.current) {
      lastChunkIdx.current = currentChunk;
      setChunkKey(k => k + 1);
    }

    // Only rebuild obstacle list when chunks change
    if (obsNeedsUpdate.current) {
      const obs: Array<{ position: THREE.Vector3; radius: number }> = [];
      for (const chunk of activeChunks) {
        for (const item of chunk.scenery) {
          if (item.isObstacle) {
            obs.push({
              position: new THREE.Vector3(...item.position),
              radius: item.radius,
            });
          }
        }
      }
      cachedObs.current = obs;
      obsNeedsUpdate.current = false;
    }
    obstacles.current = cachedObs.current;

    // Publish active chunks for PotholeDetector
    sharedActiveChunks.current = activeChunks;
    
    checkRoadDamage(simFrameData.carPosition, simFrameData.speed, mode, activeChunks, reportedDamageRef);
  });

  const terrainColor = mode === 'city' ? '#4a4a4a' : mode === 'village' ? '#5a8a3c' : '#2a4a1a';

  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, simFrameData.carPosition[2]]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color={terrainColor} roughness={1} />
      </mesh>

      {/* Secondary ground for depth (village/jungle only) */}
      {mode !== 'city' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, simFrameData.carPosition[2]]}>
          <planeGeometry args={[600, 600]} />
          <meshStandardMaterial 
            color={mode === 'village' ? '#4a7a2c' : '#1a3a0a'} 
            roughness={1} 
          />
        </mesh>
      )}

      {/* Road chunks */}
      {activeChunks.map((chunk) => (
        <group key={`road-${chunk.z}`}>
          <RoadChunk z={chunk.z} mode={mode} />
          {chunk.scenery.map((item, i) => (
            <SceneryItem key={`${chunk.z}-${i}`} item={item} isNight={isNight} mode={mode} />
          ))}
        </group>
      ))}

      {/* Street lights for city/night - emissive only, NO real lights */}
      {isNight && mode === 'city' && activeChunks.map((chunk) => (
        Array.from({ length: 5 }).map((_, i) => (
          <group key={`light-${chunk.z}-${i}`}>
            {/* Left pole */}
            <mesh position={[6.2, 3, chunk.z + i * 20]}>
              <cylinderGeometry args={[0.06, 0.08, 6, 6]} />
              <meshStandardMaterial color="#555555" metalness={0.8} />
            </mesh>
            {/* Left arm */}
            <mesh position={[5.5, 5.8, chunk.z + i * 20]} rotation={[0, 0, Math.PI / 3]}>
              <cylinderGeometry args={[0.03, 0.03, 1.5, 4]} />
              <meshStandardMaterial color="#555555" metalness={0.8} />
            </mesh>
            {/* Lamp glow */}
            <mesh position={[5.0, 6, chunk.z + i * 20]}>
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshBasicMaterial color="#ffeecc" />
            </mesh>
            {/* Fake light pool on ground */}
            <mesh position={[5.0, 0.02, chunk.z + i * 20]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[4, 16]} />
              <meshBasicMaterial color="#221a0a" transparent opacity={0.2} />
            </mesh>
            
            {/* Right pole */}
            <mesh position={[-6.2, 3, chunk.z + i * 20]}>
              <cylinderGeometry args={[0.06, 0.08, 6, 6]} />
              <meshStandardMaterial color="#555555" metalness={0.8} />
            </mesh>
            {/* Right arm */}
            <mesh position={[-5.5, 5.8, chunk.z + i * 20]} rotation={[0, 0, -Math.PI / 3]}>
              <cylinderGeometry args={[0.03, 0.03, 1.5, 4]} />
              <meshStandardMaterial color="#555555" metalness={0.8} />
            </mesh>
            {/* Lamp glow */}
            <mesh position={[-5.0, 6, chunk.z + i * 20]}>
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshBasicMaterial color="#ffeecc" />
            </mesh>
            {/* Fake light pool on ground */}
            <mesh position={[-5.0, 0.02, chunk.z + i * 20]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[4, 16]} />
              <meshBasicMaterial color="#221a0a" transparent opacity={0.2} />
            </mesh>
          </group>
        ))
      ))}

      {/* Village lamp posts at night */}
      {isNight && mode === 'village' && activeChunks.map((chunk) => (
        Array.from({ length: 2 }).map((_, i) => {
          const side = i % 2 === 0 ? 1 : -1;
          return (
            <group key={`vlamp-${chunk.z}-${i}`}>
              <mesh position={[side * 4.5, 2, chunk.z + i * 45 + 20]}>
                <cylinderGeometry args={[0.04, 0.06, 4, 6]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
              </mesh>
              <mesh position={[side * 4.5, 4.2, chunk.z + i * 45 + 20]}>
                <sphereGeometry args={[0.15, 6, 6]} />
                <meshBasicMaterial color="#ffeeaa" />
              </mesh>
              <mesh position={[side * 4.5, 0.02, chunk.z + i * 45 + 20]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[2.5, 12]} />
                <meshBasicMaterial color="#221a0a" transparent opacity={0.15} />
              </mesh>
            </group>
          );
        })
      ))}
    </>
  );
}