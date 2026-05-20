import { LevelData, GeneratorParams, DEFAULT_PARAMS } from '../core/types';
import { generateTerrain, smoothTerrain } from './terrain';
import { generatePaths } from './paths';
import { generateDecorations } from './decorations';

/**
 * Runs the full level generation pipeline:
 * 1. Generate base terrain from noise
 * 2. Smooth terrain artifacts
 * 3. Generate branching paths and POIs
 * 4. Add decoration details
 */
export function generateLevel(overrides?: Partial<GeneratorParams>): LevelData {
  const params: GeneratorParams = { ...DEFAULT_PARAMS, ...overrides };

  // Step 1: Generate base terrain
  const level = generateTerrain(params);

  // Step 2: Smooth terrain (remove noise artifacts)
  smoothTerrain(level);

  // Step 3: Generate branching paths
  generatePaths(level, params);

  // Step 4: Add decorations
  generateDecorations(level, params);

  return level;
}

export { DEFAULT_PARAMS } from '../core/types';
export type { GeneratorParams, LevelData, TileType, PathNode, Point } from '../core/types';