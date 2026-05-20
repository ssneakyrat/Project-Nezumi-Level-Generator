import { LevelData, GeneratorParams, DEFAULT_PARAMS } from '../core/types';
import { generateTerrain, smoothTerrain } from './terrain';
import { generatePaths } from './paths';
import { generateDecorations } from './decorations';

/**
 * Runs the full level generation pipeline:
 * 1. Generate base terrain from noise (stores elevation in heightMap)
 * 2. Smooth terrain artifacts
 * 3. Compute slope map, run A* pathfinding between POIs, carve wide roads
 * 4. Add decoration details
 */
export function generateLevel(overrides?: Partial<GeneratorParams>): LevelData {
  const params: GeneratorParams = { ...DEFAULT_PARAMS, ...overrides };

  // Step 1: Generate base terrain (tiles + heightMap)
  const level = generateTerrain(params);

  // Step 2: Smooth terrain (remove noise artifacts)
  smoothTerrain(level);

  // Step 3: Compute slope map, find terrain-aware paths via A*, and carve wide roads
  generatePaths(level, params);

  // Step 4: Add decorations
  generateDecorations(level, params);

  return level;
}

export { DEFAULT_PARAMS } from '../core/types';
export type { GeneratorParams, LevelData, TileType, PathNode, Point } from '../core/types';