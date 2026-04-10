/**
 * LaneOverlay — HTML overlay for lane departure warnings and
 * lane detection status. Sits outside the R3F Canvas in normal
 * HTML/CSS space, at z-index 4 (below pothole overlay z-index 5).
 *
 * Shows:
 * - Edge flash strips when departing a lane
 * - Lane detection status badge
 * - Text warning for lane departure
 */
import { useLaneDetectionStore } from '@/stores/laneDetectionStore';

export function LaneOverlay() {
  const { isLaneDetectionActive, laneDepartureWarning, currentLane } =
    useLaneDetectionStore();

  if (!isLaneDetectionActive) return null;

  return (
    <div
      id="lane-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 4,
        overflow: 'hidden',
      }}
    >
      {/* ── Left departure warning edge ───────────────── */}
      {laneDepartureWarning === 'left' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: '6px',
            background:
              'linear-gradient(to right, rgba(255, 120, 0, 0.85), transparent)',
            borderRadius: '0 4px 4px 0',
            animation: 'lane-edge-pulse 0.6s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(255, 120, 0, 0.5)',
          }}
        />
      )}

      {/* ── Right departure warning edge ──────────────── */}
      {laneDepartureWarning === 'right' && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '20%',
            bottom: '20%',
            width: '6px',
            background:
              'linear-gradient(to left, rgba(255, 120, 0, 0.85), transparent)',
            borderRadius: '4px 0 0 4px',
            animation: 'lane-edge-pulse 0.6s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(255, 120, 0, 0.5)',
          }}
        />
      )}

      {/* ── Lane departure text warning ──────────────── */}
      {laneDepartureWarning && (
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 100, 0, 0.15)',
            border: '1px solid rgba(255, 120, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            borderRadius: '8px',
            padding: '6px 16px',
            animation: 'lane-warn-text 0.8s ease-in-out infinite',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ff7800',
              boxShadow: '0 0 10px rgba(255, 120, 0, 0.8)',
              animation: 'lane-dot-blink 0.5s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 700,
              color: '#ff9933',
              textShadow: '0 0 8px rgba(255, 120, 0, 0.5)',
              letterSpacing: '1.5px',
            }}
          >
            ⚠ LANE DEPARTURE {laneDepartureWarning.toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Lane status badge ────────────────────────── */}
      <LaneStatusBadge
        active={isLaneDetectionActive}
        currentLane={currentLane}
        departing={laneDepartureWarning !== null}
      />

      {/* ── Animations ───────────────────────────────── */}
      <style>{`
        @keyframes lane-edge-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes lane-warn-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes lane-dot-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.6); }
        }
        @keyframes lane-badge-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/** Compact badge showing lane detection status */
function LaneStatusBadge({
  active,
  currentLane,
  departing,
}: {
  active: boolean;
  currentLane: 'left' | 'right';
  departing: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '82px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: departing
          ? 'rgba(255, 100, 0, 0.12)'
          : 'rgba(0, 0, 0, 0.45)',
        border: `1px solid ${
          departing
            ? 'rgba(255, 120, 0, 0.4)'
            : 'rgba(0, 212, 255, 0.25)'
        }`,
        backdropFilter: 'blur(6px)',
        borderRadius: '16px',
        padding: '3px 10px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Scan bar animation */}
      {active && !departing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            borderRadius: '16px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '30%',
              background:
                'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.08), transparent)',
              animation: 'lane-badge-scan 3s linear infinite',
            }}
          />
        </div>
      )}

      {/* Status dot */}
      <span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: departing ? '#ff7800' : '#00d4ff',
          boxShadow: `0 0 6px ${
            departing
              ? 'rgba(255, 120, 0, 0.7)'
              : 'rgba(0, 212, 255, 0.6)'
          }`,
          flexShrink: 0,
        }}
      />

      {/* Label */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          fontWeight: 600,
          color: departing ? '#ff9933' : '#00d4ff',
          textShadow: departing
            ? '0 0 4px rgba(255, 120, 0, 0.4)'
            : '0 0 4px rgba(0, 212, 255, 0.3)',
          letterSpacing: '0.8px',
          position: 'relative',
        }}
      >
        {departing ? '⚠ LANE WARN' : '◈ LANE DETECT'}
      </span>

      {/* Current lane indicator */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '8px',
          color: 'rgba(0, 212, 255, 0.5)',
          background: 'rgba(0, 212, 255, 0.06)',
          border: '1px solid rgba(0, 212, 255, 0.15)',
          borderRadius: '6px',
          padding: '0 4px',
          position: 'relative',
        }}
      >
        {currentLane === 'left' ? '← L' : 'R →'}
      </span>
    </div>
  );
}
