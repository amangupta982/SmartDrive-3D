import { useState, useCallback, useEffect } from 'react';
import { useSimulationStore, simFrameData, EnvironmentMode } from '@/stores/simulationStore';
import { usePotholeDetectionStore } from '@/stores/potholeDetectionStore';
import { useLaneDetectionStore } from '@/stores/laneDetectionStore';
import { DetectionPanel } from './DetectionPanel';

const modeLabels: Record<EnvironmentMode, string> = {
  city: '🏙️ City',
  village: '🏘️ Village',
  jungle: '🌿 Jungle',
};

/* ── Compact Mode Icons for the sleek panel ────────── */
const modeIcons: Record<EnvironmentMode, string> = {
  city: '🏙️',
  village: '🏘️',
  jungle: '🌿',
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
    <div className="sim-glass sim-border-glow rounded-xl px-6 py-3 flex flex-col items-center" style={{ minWidth: '160px' }}>
      <div className={`font-mono text-4xl font-bold ${speedColor} sim-glow-cyan`}>
        {displaySpeed}
      </div>
      <div className="text-muted-foreground font-mono text-[9px] mt-0.5">KM/H</div>
      <div className="w-full h-1 bg-secondary rounded-full mt-2 overflow-hidden">
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
        <div className="text-destructive font-mono text-[9px] mt-1.5 animate-pulse">
          ⚠️ COLLISION
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
  const { isLaneDetectionActive, toggleLaneDetection } = useLaneDetectionStore();

  const [mps, setMps] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMps(Math.round(simFrameData.speed * 0.28));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="sim-glass sim-border-glow rounded-lg px-5 py-1.5 flex items-center gap-3">
          <span className="text-primary font-mono text-[11px] font-semibold tracking-wider sim-glow-cyan">
            AI SMART VEHICLE
          </span>
          <div className="w-px h-4 bg-border" />
          <span className="text-muted-foreground font-mono text-[9px]">
            {timeOfDay === 'day' ? '☀️ DAY' : '🌙 NIGHT'}
          </span>
          <span className="text-muted-foreground font-mono text-[9px]">
            {modeLabels[mode]}
          </span>
          <div className="w-px h-4 bg-border" />
          <span className="text-muted-foreground font-mono text-[9px]">
            {cameraView === 'first-person' ? '🎯 FPV' : '🎥 TPV'}
          </span>
        </div>
      </div>

      {/* ── Compass / heading — below top bar with safe gap ── */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2">
        <div className="sim-glass rounded-full px-3 py-0.5 flex items-center gap-1.5">
          <span className="text-primary font-mono text-[9px]">⬆</span>
          <span className="text-muted-foreground font-mono text-[8px]">
            {mps} m/s
          </span>
        </div>
      </div>

      {/* ── Headlights indicator — below compass ─────── */}
      {headlightsOn && (
        <div className="absolute top-[72px] left-1/2 -translate-x-1/2">
          <div className="text-accent font-mono text-[9px] sim-glow-amber">
            💡 HEADLIGHTS
          </div>
        </div>
      )}

      {/* ── Speed gauge — bottom center, above bottom panels ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <SpeedDisplay />
      </div>

      {/* ── Mode panel — bottom-left, premium vertical ── */}
      <div className="absolute bottom-4 left-3 pointer-events-auto" style={{ maxWidth: '140px' }}>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(220 20% 11% / 0.92), hsl(220 25% 8% / 0.96))',
            border: '1px solid hsl(185 60% 30% / 0.35)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 hsl(185 60% 50% / 0.08)',
          }}
        >
          {/* Panel header */}
          <div
            className="px-3 py-1.5 flex items-center gap-2"
            style={{
              background: 'linear-gradient(90deg, hsl(185 100% 45% / 0.08), transparent)',
              borderBottom: '1px solid hsl(185 60% 30% / 0.2)',
            }}
          >
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'hsl(185 100% 50%)',
              boxShadow: '0 0 6px hsl(185 100% 50% / 0.6)',
            }} />
            <span className="font-mono text-[8px] uppercase tracking-[0.2em]" style={{ color: 'hsl(185 80% 60%)' }}>
              Environment
            </span>
          </div>

          <div className="p-2 space-y-2">
            {/* Environment buttons */}
            <div className="flex flex-col gap-1">
              {(['city', 'village', 'jungle'] as EnvironmentMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="w-full text-left font-mono text-[10px] transition-all duration-200"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: mode === m
                      ? 'linear-gradient(135deg, hsl(185 100% 45% / 0.2), hsl(185 80% 40% / 0.08))'
                      : 'hsl(220 15% 14% / 0.6)',
                    border: mode === m
                      ? '1px solid hsl(185 100% 50% / 0.5)'
                      : '1px solid transparent',
                    color: mode === m ? 'hsl(185 100% 70%)' : 'hsl(215 10% 55%)',
                    boxShadow: mode === m
                      ? '0 0 12px hsl(185 100% 50% / 0.15), inset 0 0 8px hsl(185 100% 50% / 0.05)'
                      : 'none',
                  }}
                >
                  <span style={{ marginRight: '6px' }}>{modeIcons[m]}</span>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {/* Separator with glow line */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, hsl(185 60% 40% / 0.3), transparent)',
            }} />

            {/* Toggle controls */}
            <div className="flex flex-col gap-1">
              <button
                onClick={toggleTimeOfDay}
                className="w-full text-left font-mono text-[10px] transition-all duration-200"
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: 'hsl(220 15% 14% / 0.6)',
                  border: '1px solid transparent',
                  color: 'hsl(215 10% 55%)',
                }}
              >
                {timeOfDay === 'day' ? '🌙 Night' : '☀️ Day'}
              </button>
              {timeOfDay === 'night' && (
                <button
                  onClick={toggleHeadlights}
                  className="w-full text-left font-mono text-[10px] transition-all duration-200"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: headlightsOn
                      ? 'linear-gradient(135deg, hsl(35 100% 55% / 0.2), hsl(35 80% 40% / 0.08))'
                      : 'hsl(220 15% 14% / 0.6)',
                    border: headlightsOn
                      ? '1px solid hsl(35 100% 55% / 0.5)'
                      : '1px solid transparent',
                    color: headlightsOn ? 'hsl(35 100% 70%)' : 'hsl(215 10% 55%)',
                    boxShadow: headlightsOn
                      ? '0 0 12px hsl(35 100% 55% / 0.15)'
                      : 'none',
                  }}
                >
                  💡 Lights {headlightsOn ? 'ON' : 'OFF'}
                </button>
              )}
              <button
                onClick={toggleCameraView}
                className="w-full text-left font-mono text-[10px] transition-all duration-200"
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: cameraView === 'first-person'
                    ? 'linear-gradient(135deg, hsl(185 100% 45% / 0.2), hsl(185 80% 40% / 0.08))'
                    : 'hsl(220 15% 14% / 0.6)',
                  border: cameraView === 'first-person'
                    ? '1px solid hsl(185 100% 50% / 0.5)'
                    : '1px solid transparent',
                  color: cameraView === 'first-person' ? 'hsl(185 100% 70%)' : 'hsl(215 10% 55%)',
                  boxShadow: cameraView === 'first-person'
                    ? '0 0 12px hsl(185 100% 50% / 0.15)'
                    : 'none',
                }}
              >
                {cameraView === 'first-person' ? '🎯 FPV' : '🎥 TPV'}
              </button>
            </div>

            {/* Separator */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, hsl(145 60% 40% / 0.3), transparent)',
            }} />

            {/* AI Systems */}
            <div>
              <div className="font-mono text-[7px] uppercase tracking-[0.15em] mb-1" style={{ color: 'hsl(145 50% 50% / 0.6)' }}>
                AI Systems
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={toggleDetection}
                  className="w-full text-left font-mono text-[10px] transition-all duration-200"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: isDetectionActive
                      ? 'linear-gradient(135deg, hsl(145 70% 45% / 0.18), hsl(145 60% 35% / 0.06))'
                      : 'hsl(220 15% 14% / 0.6)',
                    border: isDetectionActive
                      ? '1px solid hsl(145 70% 50% / 0.45)'
                      : '1px solid transparent',
                    color: isDetectionActive ? 'hsl(145 70% 65%)' : 'hsl(215 10% 55%)',
                    boxShadow: isDetectionActive
                      ? '0 0 12px hsl(145 70% 50% / 0.12)'
                      : 'none',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                    background: isDetectionActive ? 'hsl(145 70% 50%)' : 'hsl(215 10% 35%)',
                    boxShadow: isDetectionActive ? '0 0 6px hsl(145 70% 50% / 0.6)' : 'none',
                    marginRight: '6px', verticalAlign: 'middle',
                  }} />
                  Detect
                </button>
                <button
                  onClick={toggleLaneDetection}
                  className="w-full text-left font-mono text-[10px] transition-all duration-200"
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: isLaneDetectionActive
                      ? 'linear-gradient(135deg, hsl(200 80% 50% / 0.18), hsl(200 70% 40% / 0.06))'
                      : 'hsl(220 15% 14% / 0.6)',
                    border: isLaneDetectionActive
                      ? '1px solid hsl(200 80% 50% / 0.45)'
                      : '1px solid transparent',
                    color: isLaneDetectionActive ? 'hsl(200 80% 65%)' : 'hsl(215 10% 55%)',
                    boxShadow: isLaneDetectionActive
                      ? '0 0 12px hsl(200 80% 50% / 0.12)'
                      : 'none',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                    background: isLaneDetectionActive ? 'hsl(200 80% 50%)' : 'hsl(215 10% 35%)',
                    boxShadow: isLaneDetectionActive ? '0 0 6px hsl(200 80% 50% / 0.6)' : 'none',
                    marginRight: '6px', verticalAlign: 'middle',
                  }} />
                  Lanes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls help — bottom-right, premium keycap grid ── */}
      <div className="absolute bottom-4 right-3">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(220 20% 11% / 0.92), hsl(220 25% 8% / 0.96))',
            border: '1px solid hsl(185 60% 30% / 0.35)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 hsl(185 60% 50% / 0.08)',
          }}
        >
          {/* Panel header */}
          <div
            className="px-3 py-1.5 flex items-center gap-2"
            style={{
              background: 'linear-gradient(90deg, hsl(185 100% 45% / 0.08), transparent)',
              borderBottom: '1px solid hsl(185 60% 30% / 0.2)',
            }}
          >
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'hsl(185 100% 50%)',
              boxShadow: '0 0 6px hsl(185 100% 50% / 0.6)',
            }} />
            <span className="font-mono text-[8px] uppercase tracking-[0.2em]" style={{ color: 'hsl(185 80% 60%)' }}>
              Controls
            </span>
          </div>

          <div className="p-2.5 space-y-1">
            {[
              { keys: 'W / ↑', action: 'Accelerate' },
              { keys: 'S / ↓', action: 'Reverse' },
              { keys: 'A D', action: 'Steer' },
              { keys: 'Space', action: 'Brake' },
              { keys: 'L', action: 'Lights' },
              { keys: 'N', action: 'Day / Night' },
              { keys: 'V', action: 'Camera' },
              { keys: 'D', action: 'Detect' },
              { keys: 'G', action: 'Lanes' },
            ].map(({ keys, action }) => (
              <div key={keys + action} className="flex items-center justify-between gap-3" style={{ minWidth: '140px' }}>
                <span
                  className="font-mono text-[9px] font-semibold"
                  style={{
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'linear-gradient(180deg, hsl(220 15% 20%), hsl(220 15% 14%))',
                    border: '1px solid hsl(220 15% 28% / 0.8)',
                    color: 'hsl(185 80% 65%)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 hsl(220 15% 30% / 0.4)',
                    textShadow: '0 0 8px hsl(185 100% 50% / 0.3)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {keys}
                </span>
                <span className="font-mono text-[9px]" style={{ color: 'hsl(215 10% 50%)' }}>
                  {action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Detection Panel — top-right ───────────────── */}
      <DetectionPanel />

      {/* ── First-person mode indicator — top-left ────── */}
      {cameraView === 'first-person' && (
        <div className="absolute top-3 left-3">
          <div
            className="rounded-lg px-2.5 py-1"
            style={{
              background: 'hsl(var(--sim-glass) / 0.75)',
              border: '1px solid hsl(var(--sim-glass-border) / 0.6)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <span className="text-primary font-mono text-[9px] sim-glow-cyan">
              🎯 COCKPIT
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
