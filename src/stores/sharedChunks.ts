/**
 * Shared ref for active world chunks.
 * World.tsx writes to this; PotholeDetector reads from it.
 * Using a module-level ref avoids prop drilling and re-renders.
 */

interface ChunkSceneryItem {
  type: string;
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  color2?: string;
  isObstacle: boolean;
  radius: number;
  rotation?: number;
}

export interface SharedChunk {
  z: number;
  scenery: ChunkSceneryItem[];
}

/** Module-level mutable ref — no React re-renders */
export const sharedActiveChunks: { current: SharedChunk[] } = { current: [] };
