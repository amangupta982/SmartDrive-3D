import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore, simFrameData } from '@/stores/simulationStore';

export function CameraController() {
  const { camera } = useThree();
  const { cameraView } = useSimulationStore();
  const smoothPos = useRef(new THREE.Vector3(0, 6, -10));
  const smoothLook = useRef(new THREE.Vector3(0, 1, 10));
  const shakeOffset = useRef(new THREE.Vector2(0, 0));
  const transitionProgress = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const rot = simFrameData.carRotation;
    const carPosition = simFrameData.carPosition;
    const speed = simFrameData.speed;
    const shakeIntensity = simFrameData.shakeIntensity;
    
    // Transition between camera modes
    const targetTransition = cameraView === 'first-person' ? 1 : 0;
    transitionProgress.current += (targetTransition - transitionProgress.current) * Math.min(dt * 4, 1);
    const t = transitionProgress.current;

    // === Third-person camera — proper over-the-shoulder chase cam ===
    //
    // At idle:     ~12 units behind, 5 units up  → car sits prominently in lower-center
    // At top speed: ~16 units behind, 6 units up → camera pulls back for speed drama
    //
    const speedNorm = Math.min(speed / 150, 1);

    const followDist   = 12  + speedNorm * 4;   // 12 → 16
    const followHeight =  5  + speedNorm * 1;   //  5 →  6

    // Camera sits BEHIND the car (along +rot direction, since car faces -rot)
    const tp_targetX = carPosition[0] + Math.sin(rot) * followDist;
    const tp_targetZ = carPosition[2] + Math.cos(rot) * followDist;
    const tp_targetY = carPosition[1] + followHeight;

    const tp_pos = new THREE.Vector3(tp_targetX, tp_targetY, tp_targetZ);
    
    // Look-at target: slightly ahead of the car, at car roof height
    // A shorter look-ahead keeps the car visible in the lower third of screen
    const lookAheadDist = 6 + speedNorm * 3;   // 6 → 9
    const lookHeight    = carPosition[1] + 1.5; // Look at car roof/windshield level

    const tp_lookX = carPosition[0] - Math.sin(rot) * lookAheadDist;
    const tp_lookZ = carPosition[2] - Math.cos(rot) * lookAheadDist;
    const tp_look = new THREE.Vector3(tp_lookX, lookHeight, tp_lookZ);

    // === First-person camera ===
    const fp_offsetX = 0.25;
    const fp_offsetY = 0.88;
    const fp_offsetZ = -0.2;
    
    const fp_x = carPosition[0] + Math.sin(rot) * fp_offsetZ - Math.cos(rot) * fp_offsetX;
    const fp_z = carPosition[2] + Math.cos(rot) * fp_offsetZ + Math.sin(rot) * fp_offsetX;
    const fp_y = carPosition[1] + fp_offsetY;
    
    const fp_pos = new THREE.Vector3(fp_x, fp_y, fp_z);
    
    const fp_lookDist = 40;
    const fp_lookX = carPosition[0] - Math.sin(rot) * fp_lookDist;
    const fp_lookZ = carPosition[2] - Math.cos(rot) * fp_lookDist;
    const fp_look = new THREE.Vector3(fp_lookX, carPosition[1] + 0.4, fp_lookZ);

    // === Interpolate between modes ===
    const targetPos = new THREE.Vector3().lerpVectors(tp_pos, fp_pos, t);
    const targetLook = new THREE.Vector3().lerpVectors(tp_look, fp_look, t);

    // Smoother lerp — slightly faster for TPV for better responsiveness during turns
    const smoothFactor = cameraView === 'first-person' ? 6 : 5;
    const lerpAmount = 1 - Math.exp(-smoothFactor * dt);
    smoothPos.current.lerp(targetPos, lerpAmount);
    smoothLook.current.lerp(targetLook, lerpAmount);

    // Smooth shake
    const shakeMultiplier = cameraView === 'first-person' ? 1.5 : 0.7;
    const targetShakeX = shakeIntensity * shakeMultiplier * (Math.sin(Date.now() * 0.03) * 2);
    const targetShakeY = shakeIntensity * shakeMultiplier * (Math.cos(Date.now() * 0.04) * 2);
    shakeOffset.current.x += (targetShakeX - shakeOffset.current.x) * 0.3;
    shakeOffset.current.y += (targetShakeY - shakeOffset.current.y) * 0.3;

    // First-person head bob
    if (cameraView === 'first-person' && speed > 5) {
      const bobFreq = Math.min(speed / 30, 3);
      const bobAmp = Math.min(speed / 500, 0.02);
      shakeOffset.current.y += Math.sin(Date.now() * 0.005 * bobFreq) * bobAmp;
      shakeOffset.current.x += Math.sin(Date.now() * 0.003 * bobFreq) * bobAmp * 0.3;
    }

    camera.position.copy(smoothPos.current);
    camera.position.x += shakeOffset.current.x;
    camera.position.y += shakeOffset.current.y;
    camera.lookAt(smoothLook.current);

    // Adjust FOV — slightly narrower TPV FOV to zoom in on the car more
    const targetFov = cameraView === 'first-person' ? 75 : 60;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov += (targetFov - cam.fov) * dt * 3;
    cam.updateProjectionMatrix();
  });

  return null;
}
