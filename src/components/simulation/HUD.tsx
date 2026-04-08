import { useState, useCallback, useEffect } from 'react';
import { useSimulationStore, simFrameData, EnvironmentMode } from '@/stores/simulationStore';
import { usePotholeDetectionStore } from '@/stores/potholeDetectionStore';
import { DetectionPanel } from './DetectionPanel';

const modeLabels: Record<EnvironmentMode, string> = {
  city: '🏙️ City',
  village: '🏘️ Village',
  jungle: '🌿 Jungle',
};

function SpeedDisplay() {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  
  // Poll speed from frame data at reduced rate (15fps instead of 60)
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplaySpeed(Math.round(simFrameData.speed));
    }, 66); // ~15 fps
    return () => clearInterval(interval);
  }, []);
  
  const speedPercent = Math.min(displaySpeed / 150, 1);
  const speedColor = displaySpeed > 120 ? 'text-destructive' : displaySpeed > 80 ? 'text-accent' : 'text-primary';
  const isColliding = simFrameData.isColliding;

  return (
    <div className="sim-glass sim-border-glow rounded-xl px-8 py-4 flex flex-col items-center min-w-[200px]">
      <div className={`font-mono text-5xl font-bold ${speedColor} sim-glow-cyan`}>
        {displaySpeed}
      </div>
      <div className="text-muted-foreground font-mono text-xs mt-1">KM/H</div>
      <div className="w-full h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-200"
          style={{ 
            width: `${speedPercent * 100}%`,
            background: displaySpeed > 120 
              ? 'hsl(var(--destructive))' 
              : displaySpeed > 80 
              ? 'hsl(var(--accent))' 
              : 'hsl(var(--primary))'
          }}
        />
      </div>
      {isColliding && (
        <div className="text-destructive font-mono text-xs mt-2 animate-pulse">
          ⚠️ COLLISION DETECTED
        </div>
      )}
    </div>
  );
}

export function HUD() {
  const { 
    mode, timeOfDay, headlightsOn, cameraView,
    setMode, toggleTimeOfDay, toggleHeadlights, toggleCameraView
  } = useSimulationStore();
  const { isDetectionActive, toggleDetection } = usePotholeDetectionStore();

  const [mps, setMps] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMps(Math.round(simFrameData.speed * 0.28));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="sim-glass sim-border-glow rounded-lg px-6 py-2 flex items-center gap-4">
          <span className="text-primary font-mono text-sm font-semibold tracking-wider sim-glow-cyan">
            AI SMART VEHICLE SIMULATION
          </span>
          <div className="w-px h-5 bg-border" />
          <span className="text-muted-foreground font-mono text-xs">
            {timeOfDay === 'day' ? '☀️ DAY' : '🌙 NIGHT'}
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {modeLabels[mode]}
          </span>
          <div className="w-px h-5 bg-border" />
          <span className="text-muted-foreground font-mono text-xs">
            {cameraView === 'first-person' ? '🎯 FPV' : '🎥 TPV'}
          </span>
        </div>
      </div>

      {/* Speed gauge - bottom center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <SpeedDisplay />
      </div>

      {/* Compass / heading indicator */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2">
        <div className="sim-glass rounded-full px-4 py-1 flex items-center gap-2">
          <span className="text-primary font-mono text-[10px]">⬆</span>
          <span className="text-muted-foreground font-mono text-[9px]">
            {mps} m/s
          </span>
        </div>
      </div>

      {/* Controls panel - bottom left */}
      <div className="absolute bottom-8 left-4 pointer-events-auto">
        <div className="sim-glass rounded-lg p-3 space-y-2">
          <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mb-2">Mode</div>
          <div className="flex flex-col gap-1">
            {(['city', 'village', 'jungle'] as EnvironmentMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  mode === m 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <button
              onClick={toggleTimeOfDay}
              className="w-full px-3 py-1.5 rounded text-xs font-mono bg-secondary text-secondary-foreground hover:bg-accent transition-all"
            >
              {timeOfDay === 'day' ? '🌙 Night Mode' : '☀️ Day Mode'}
            </button>
            {timeOfDay === 'night' && (
              <button
                onClick={toggleHeadlights}
                className={`w-full px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  headlightsOn 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                💡 Headlights {headlightsOn ? 'ON' : 'OFF'}
              </button>
            )}
            <button
              onClick={toggleCameraView}
              className={`w-full px-3 py-1.5 rounded text-xs font-mono transition-all ${
                cameraView === 'first-person'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {cameraView === 'first-person' ? '🎯 First Person' : '🎥 Third Person'}
            </button>
            <button
              onClick={toggleDetection}
              className={`w-full px-3 py-1.5 rounded text-xs font-mono transition-all ${
                isDetectionActive
                  ? 'bg-green-600/30 text-green-400 border border-green-500/40'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {isDetectionActive ? '🟢 Detection ON' : '⚫ Detection OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Controls help - bottom right */}
      <div className="absolute bottom-8 right-4">
        <div className="sim-glass rounded-lg p-3">
          <div className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mb-2">Controls</div>
          <div className="space-y-1 text-xs font-mono text-muted-foreground">
            <div><span className="text-primary">W/↑</span> Accelerate</div>
            <div><span className="text-primary">S/↓</span> Reverse</div>
            <div><span className="text-primary">A/← D/→</span> Steer</div>
            <div><span className="text-primary">Space</span> Brake</div>
            <div><span className="text-primary">L</span> Headlights</div>
            <div><span className="text-primary">N</span> Day/Night</div>
            <div><span className="text-primary">V</span> Camera View</div>
            <div><span className="text-primary">D</span> Detection</div>
          </div>
        </div>
      </div>

      {/* Detection Panel - right side */}
      <DetectionPanel />

      {/* Headlights indicator */}
      {headlightsOn && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 mt-6">
          <div className="text-accent font-mono text-xs sim-glow-amber">
            💡 HEADLIGHTS ACTIVE
          </div>
        </div>
      )}

      {/* First-person mode indicator */}
      {cameraView === 'first-person' && (
        <div className="absolute top-4 right-4">
          <div className="sim-glass rounded-lg px-3 py-1.5">
            <span className="text-primary font-mono text-[10px] sim-glow-cyan">
              🎯 COCKPIT VIEW
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
