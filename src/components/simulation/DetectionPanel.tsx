import { useEffect } from 'react';
import { useSimulationStore } from '@/stores/simulationStore';

const typeIcons: Record<string, string> = {
  pothole: '🕳️',
  debris: '🪨',
  rock: '⛰️',
  fallen_tree: '🌲',
};

const typeLabels: Record<string, string> = {
  pothole: 'POTHOLE',
  debris: 'DEBRIS',
  rock: 'ROCK',
  fallen_tree: 'FALLEN TREE',
};

const severityColors: Record<string, string> = {
  critical: '#ff4444',
  warning: '#ffaa00',
  info: '#00ccff',
};

const severityBg: Record<string, string> = {
  critical: 'rgba(255, 68, 68, 0.15)',
  warning: 'rgba(255, 170, 0, 0.15)',
  info: 'rgba(0, 204, 255, 0.15)',
};

export function DetectionPanel() {
  const { detectionAlerts, clearOldAlerts, cameraView } = useSimulationStore();

  // Clean old alerts periodically
  useEffect(() => {
    const interval = setInterval(clearOldAlerts, 5000);
    return () => clearInterval(interval);
  }, [clearOldAlerts]);

  // Don't show in first-person (cockpit has its own screen)
  if (cameraView === 'first-person') return null;

  return (
    <div className="absolute top-12 right-3 pointer-events-none" style={{ width: '260px' }}>
      {/* Header */}
      <div className="rounded-t-lg px-3 py-1.5 border-b border-[hsl(var(--sim-glass-border)/0.6)]" style={{ background: 'hsl(var(--sim-glass) / 0.75)', backdropFilter: 'blur(14px)' }}>
        <div className="flex items-center gap-2">
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: detectionAlerts.length > 0 ? '#ff4444' : '#00cc66',
            boxShadow: detectionAlerts.length > 0
              ? '0 0 8px rgba(255,68,68,0.8)'
              : '0 0 8px rgba(0,204,102,0.8)',
            animation: detectionAlerts.length > 0 ? 'pulse 1s infinite' : 'none',
          }} />
          <span className="text-primary font-mono text-[10px] uppercase tracking-widest sim-glow-cyan">
            AI Detection System
          </span>
        </div>
        <div className="font-mono text-[9px] text-muted-foreground mt-1">
          {detectionAlerts.length > 0 
            ? `${detectionAlerts.length} hazard${detectionAlerts.length > 1 ? 's' : ''} detected` 
            : 'Road clear — No hazards'}
        </div>
      </div>

      {/* Alert List */}
      <div className="rounded-b-lg overflow-hidden" style={{ maxHeight: '280px', overflowY: 'auto', background: 'hsl(var(--sim-glass) / 0.7)', backdropFilter: 'blur(14px)', border: '1px solid hsl(var(--sim-glass-border) / 0.5)', borderTop: 'none' }}>
        {detectionAlerts.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="font-mono text-2xl mb-2">✅</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              Scanning road ahead...
            </div>
            <div className="mt-3 flex justify-center">
              <div style={{
                width: '60px',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, hsl(var(--sim-cyan)), transparent)',
                animation: 'scanline-move 2s ease-in-out infinite',
              }} />
            </div>
          </div>
        ) : (
          detectionAlerts.map((alert, index) => {
            const age = (Date.now() - alert.timestamp) / 1000;
            const isNew = age < 2;
            
            return (
              <div
                key={alert.id}
                style={{
                  borderLeft: `3px solid ${severityColors[alert.severity]}`,
                  background: isNew ? severityBg[alert.severity] : 'transparent',
                  animation: isNew ? 'alert-slide-in 0.4s ease-out' : 'none',
                  opacity: Math.max(0.4, 1 - (index * 0.1)),
                  transition: 'background 0.5s ease, opacity 0.3s ease',
                }}
                className="px-3 py-2 border-b border-[hsl(var(--sim-glass-border)/0.5)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{typeIcons[alert.type] || '⚠️'}</span>
                    <span className="font-mono text-[11px] font-semibold" style={{ color: severityColors[alert.severity] }}>
                      {typeLabels[alert.type] || 'HAZARD'}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {age < 5 ? 'NOW' : `${Math.floor(age)}s ago`}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[9px] text-muted-foreground">
                    📍 {alert.distance}
                  </span>
                  <span 
                    className="font-mono text-[8px] px-1.5 py-0.5 rounded-full uppercase"
                    style={{
                      color: severityColors[alert.severity],
                      border: `1px solid ${severityColors[alert.severity]}40`,
                      background: `${severityColors[alert.severity]}10`,
                    }}
                  >
                    {alert.severity}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes alert-slide-in {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes scanline-move {
          0%, 100% { transform: translateX(-30px); opacity: 0; }
          50% { transform: translateX(30px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
