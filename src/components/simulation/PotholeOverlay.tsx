/**
 * PotholeOverlay — HTML overlay that renders depth-aware green bounding boxes
 * on top of the 3D simulation canvas for detected potholes.
 *
 * Depth zones control visual intensity:
 * - Far (40–55m): faint/thin green boxes
 * - Mid (20–40m): normal boxes
 * - Near (<20m): bold/thick boxes with strong glow
 *
 * This component sits OUTSIDE the R3F Canvas in normal HTML/CSS space.
 * It reads screen-projected coordinates from the detection store
 * and renders animated green bounding boxes with labels.
 */
import { usePotholeDetectionStore, DepthZone } from '@/stores/potholeDetectionStore';
import { useRef } from 'react';

const TYPE_LABELS: Record<string, string> = {
  pothole: 'POTHOLE',
  debris: 'DEBRIS',
  rock: 'ROCK',
};

/** Depth-zone-aware visual configuration */
interface DepthVisuals {
  borderWidth: number;
  borderOpacity: number;
  glowIntensity: number;
  labelOpacity: number;
  cornerSize: number;
  cornerWidth: number;
  showLabel: boolean;
  showDistance: boolean;
  pulseSpeed: number;
  bgOpacity: number;
}

function getDepthVisuals(zone: DepthZone, distance: number): DepthVisuals {
  switch (zone) {
    case 'far':
      // Faint and thin – subtle presence
      return {
        borderWidth: 1,
        borderOpacity: 0.35 + (1 - distance / 55) * 0.1,
        glowIntensity: 0.15,
        labelOpacity: 0.5,
        cornerSize: 6,
        cornerWidth: 1.5,
        showLabel: true,
        showDistance: true,
        pulseSpeed: 2.0,
        bgOpacity: 0.01,
      };
    case 'mid':
      // Normal presence
      return {
        borderWidth: 2,
        borderOpacity: 0.6 + (1 - distance / 40) * 0.15,
        glowIntensity: 0.4,
        labelOpacity: 0.8,
        cornerSize: 8,
        cornerWidth: 2,
        showLabel: true,
        showDistance: true,
        pulseSpeed: 1.5,
        bgOpacity: 0.03,
      };
    case 'near':
      // Bold and prominent – urgent
      return {
        borderWidth: Math.min(4, Math.max(3, 20 / Math.max(distance, 3))),
        borderOpacity: 0.9,
        glowIntensity: 0.8 + (1 - distance / 20) * 0.2,
        labelOpacity: 1.0,
        cornerSize: 12,
        cornerWidth: 3,
        showLabel: true,
        showDistance: true,
        pulseSpeed: 1.0,
        bgOpacity: 0.06,
      };
  }
}

export function PotholeOverlay() {
  const { detectedPotholes, isDetectionActive } = usePotholeDetectionStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent overlay from blocking mouse events on the simulation
  if (!isDetectionActive) return null;

  return (
    <div
      ref={containerRef}
      id="pothole-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      {detectedPotholes.map((pothole) => {
        if (!pothole.screenBox) return null;

        const { x, y, width, height } = pothole.screenBox;

        // Convert normalized coords (0..1) to percentage
        const left = x * 100;
        const top = y * 100;
        const boxW = width * 100;
        const boxH = height * 100;

        // Skip if off-screen
        if (left < -10 || left > 110 || top < -10 || top > 110) return null;

        // Get depth-aware visual config
        const visuals = getDepthVisuals(pothole.depthZone, pothole.distance);

        // Confidence percentage
        const confPercent = Math.round(pothole.confidence * 100);

        // Transition speed based on depth zone (far objects transition slower)
        const transitionSpeed = pothole.depthZone === 'far' ? '0.15s' : pothole.depthZone === 'mid' ? '0.1s' : '0.06s';

        return (
          <div
            key={pothole.id}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: `${boxW}%`,
              height: `${boxH}%`,
              // Minimum pixel sizes scale with depth
              minWidth: pothole.depthZone === 'far' ? '18px' : pothole.depthZone === 'mid' ? '28px' : '40px',
              minHeight: pothole.depthZone === 'far' ? '14px' : pothole.depthZone === 'mid' ? '22px' : '30px',
              // The green bounding box — depth-aware
              border: `${visuals.borderWidth}px solid rgba(0, 255, 60, ${visuals.borderOpacity})`,
              borderRadius: pothole.depthZone === 'far' ? '2px' : '4px',
              // Glow effect — depth-aware
              boxShadow: visuals.glowIntensity > 0.1
                ? `
                  0 0 ${8 * visuals.glowIntensity}px rgba(0, 255, 60, ${0.4 * visuals.glowIntensity}),
                  inset 0 0 ${6 * visuals.glowIntensity}px rgba(0, 255, 60, ${0.1 * visuals.glowIntensity})
                `
                : 'none',
              // Subtle background tint
              background: `rgba(0, 255, 60, ${visuals.bgOpacity})`,
              // Smooth tracking animation — speed adapts to depth
              transition: `left ${transitionSpeed} linear, top ${transitionSpeed} linear, width ${transitionSpeed} linear, height ${transitionSpeed} linear, opacity 0.2s ease`,
            }}
          >
            {/* Corner markers for targeting bracket effect */}
            <TargetCorners
              color={`rgba(0, 255, 60, ${visuals.borderOpacity})`}
              size={visuals.cornerSize}
              thickness={visuals.cornerWidth}
            />

            {/* Label above the box — only for mid/near, abbreviated for far */}
            {visuals.showLabel && (
              <div
                style={{
                  position: 'absolute',
                  top: pothole.depthZone === 'far' ? '-16px' : '-24px',
                  left: '0',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: visuals.labelOpacity,
                }}
              >
                <div
                  style={{
                    background: `rgba(0, 255, 60, ${pothole.depthZone === 'far' ? 0.08 : 0.15})`,
                    border: `1px solid rgba(0, 255, 60, ${visuals.borderOpacity * 0.7})`,
                    backdropFilter: pothole.depthZone !== 'far' ? 'blur(4px)' : 'none',
                    borderRadius: '3px',
                    padding: pothole.depthZone === 'far' ? '1px 4px' : '2px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  {/* Pulsing indicator dot — only for mid/near */}
                  {pothole.depthZone !== 'far' && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#00ff3c',
                        boxShadow: '0 0 6px rgba(0, 255, 60, 0.8)',
                        animation: `pothole-pulse ${visuals.pulseSpeed}s ease-in-out infinite`,
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: pothole.depthZone === 'far' ? '8px' : '10px',
                      fontWeight: pothole.depthZone === 'near' ? 700 : 600,
                      color: `rgba(0, 255, 60, ${visuals.labelOpacity})`,
                      textShadow: pothole.depthZone !== 'far'
                        ? `0 0 8px rgba(0, 255, 60, ${0.6 * visuals.glowIntensity})`
                        : 'none',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {TYPE_LABELS[pothole.type] || 'HAZARD'}
                  </span>
                </div>
              </div>
            )}

            {/* Distance & confidence below the box */}
            {visuals.showDistance && (
              <div
                style={{
                  position: 'absolute',
                  bottom: pothole.depthZone === 'far' ? '-14px' : '-20px',
                  left: '0',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: visuals.labelOpacity,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: pothole.depthZone === 'far' ? '7px' : '9px',
                    color: `rgba(0, 255, 60, ${visuals.labelOpacity * 0.9})`,
                    textShadow: pothole.depthZone !== 'far'
                      ? '0 0 4px rgba(0, 255, 60, 0.4)'
                      : 'none',
                  }}
                >
                  {pothole.distance.toFixed(1)}m
                </span>
                {/* Show confidence badge only for mid/near */}
                {pothole.depthZone !== 'far' && (
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '8px',
                      color: `rgba(0, 255, 60, ${visuals.labelOpacity * 0.75})`,
                      background: 'rgba(0, 255, 60, 0.08)',
                      border: '1px solid rgba(0, 255, 60, 0.2)',
                      borderRadius: '2px',
                      padding: '0 3px',
                    }}
                  >
                    {confPercent}%
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Detection status indicator — top-center of overlay */}
      <DetectionStatusBadge
        count={detectedPotholes.length}
        nearCount={detectedPotholes.filter((p) => p.depthZone === 'near').length}
        midCount={detectedPotholes.filter((p) => p.depthZone === 'mid').length}
        farCount={detectedPotholes.filter((p) => p.depthZone === 'far').length}
      />

      {/* Keyframe animations */}
      <style>{`
        @keyframes pothole-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes pothole-scan {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes status-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 60, 0.3); }
          50% { box-shadow: 0 0 16px rgba(0, 255, 60, 0.6); }
        }
        @keyframes status-glow-urgent {
          0%, 100% { box-shadow: 0 0 8px rgba(255, 68, 68, 0.3); }
          50% { box-shadow: 0 0 20px rgba(255, 68, 68, 0.7); }
        }
      `}</style>
    </div>
  );
}

/** Four corner bracket markers for tactical look – depth-aware sizing */
function TargetCorners({
  color,
  size = 10,
  thickness = 3,
}: {
  color: string;
  size?: number;
  thickness?: number;
}) {
  const cornerStyle = (
    top: boolean,
    left: boolean,
  ): React.CSSProperties => ({
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    ...(top ? { top: '-1px' } : { bottom: '-1px' }),
    ...(left ? { left: '-1px' } : { right: '-1px' }),
    borderColor: color,
    borderStyle: 'solid',
    borderWidth: '0',
    ...(top && left
      ? { borderTopWidth: `${thickness}px`, borderLeftWidth: `${thickness}px`, borderTopLeftRadius: '2px' }
      : top && !left
      ? { borderTopWidth: `${thickness}px`, borderRightWidth: `${thickness}px`, borderTopRightRadius: '2px' }
      : !top && left
      ? { borderBottomWidth: `${thickness}px`, borderLeftWidth: `${thickness}px`, borderBottomLeftRadius: '2px' }
      : { borderBottomWidth: `${thickness}px`, borderRightWidth: `${thickness}px`, borderBottomRightRadius: '2px' }),
  });

  return (
    <>
      <div style={cornerStyle(true, true)} />
      <div style={cornerStyle(true, false)} />
      <div style={cornerStyle(false, true)} />
      <div style={cornerStyle(false, false)} />
    </>
  );
}

/** Small badge to show detection status with depth zone breakdown */
function DetectionStatusBadge({
  count,
  nearCount,
  midCount,
  farCount,
}: {
  count: number;
  nearCount: number;
  midCount: number;
  farCount: number;
}) {
  const hasUrgent = nearCount > 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: count > 0 ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.4)',
        border: `1px solid ${hasUrgent ? 'rgba(255, 68, 68, 0.5)' : count > 0 ? 'rgba(0, 255, 60, 0.5)' : 'rgba(0, 255, 60, 0.2)'}`,
        backdropFilter: 'blur(6px)',
        borderRadius: '20px',
        padding: '4px 12px',
        animation: hasUrgent
          ? 'status-glow-urgent 1.5s ease-in-out infinite'
          : count > 0
            ? 'status-glow 2s ease-in-out infinite'
            : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Scanning/active dot */}
      <span
        style={{
          display: 'inline-block',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: hasUrgent ? '#ff4444' : count > 0 ? '#ffaa00' : '#00ff3c',
          boxShadow: hasUrgent
            ? '0 0 8px rgba(255, 68, 68, 0.8)'
            : count > 0
              ? '0 0 6px rgba(255, 170, 0, 0.6)'
              : '0 0 6px rgba(0, 255, 60, 0.6)',
          animation: 'pothole-pulse 1.5s ease-in-out infinite',
        }}
      />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          fontWeight: 600,
          color: hasUrgent ? '#ff6666' : count > 0 ? '#ffcc44' : '#00ff3c',
          textShadow: hasUrgent
            ? '0 0 6px rgba(255, 68, 68, 0.5)'
            : '0 0 4px rgba(0, 255, 60, 0.4)',
          letterSpacing: '1px',
        }}
      >
        {count > 0
          ? `⚠ ${count} HAZARD${count > 1 ? 'S' : ''}`
          : '● SCANNING 55m'}
      </span>
      {/* Depth zone breakdown when detections exist */}
      {count > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginLeft: '2px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
            paddingLeft: '6px',
          }}
        >
          {nearCount > 0 && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '8px',
                color: '#ff6666',
                background: 'rgba(255, 68, 68, 0.15)',
                border: '1px solid rgba(255, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '0 4px',
              }}
            >
              {nearCount} NEAR
            </span>
          )}
          {midCount > 0 && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '8px',
                color: '#ffcc44',
                background: 'rgba(255, 204, 68, 0.12)',
                border: '1px solid rgba(255, 204, 68, 0.25)',
                borderRadius: '8px',
                padding: '0 4px',
              }}
            >
              {midCount} MID
            </span>
          )}
          {farCount > 0 && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '8px',
                color: 'rgba(0, 255, 60, 0.6)',
                background: 'rgba(0, 255, 60, 0.08)',
                border: '1px solid rgba(0, 255, 60, 0.2)',
                borderRadius: '8px',
                padding: '0 4px',
              }}
            >
              {farCount} FAR
            </span>
          )}
        </div>
      )}
    </div>
  );
}
