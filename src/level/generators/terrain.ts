import { TileType, LevelData, GeneratorParams } from '../core/types';
import { Noise2D } from '../core/noise';

/**
 * Generates the base terrain for the level using 2D noise.
 * Classifies tiles based on noise thresholds:
 *  - waterLevel → WATER / SAND
 *  - Between water and forest → GRASS
 *  - forestDensity threshold → FOREST (on higher ground)
 *  - mountainLevel → MOUNTAIN / ROCK
 */
export function generateTerrain(params: GeneratorParams): LevelData {
  const { width, height, seed, waterLevel, forestDensity, mountainLevel } = params;

  const noise = new Noise2D(seed);
  const terrainNoise = new Noise2D(seed + 1);
  const detailNoise = new Noise2D(seed + 2);

  const scale = 0.08; // Frequency scale for the noise

  const tiles: TileType[][] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      // Sample noise at this position
      const nx = x * scale;
      const ny = y * scale;
      const elevation = noise.octaveNoise(nx, ny, 4);
      const detail = detailNoise.octaveNoise(nx * 2, ny * 2, 2);
      const biomeVal = terrainNoise.octaveNoise(nx * 1.5 + 100, ny * 1.5 + 100, 3);

      let tile: TileType;

      if (elevation < waterLevel - 0.05) {
        // Deep water
        tile = TileType.WATER;
      } else if (elevation < waterLevel + 0.02) {
        // Shoreline sand
        tile = TileType.SAND;
      } else if (elevation > mountainLevel) {
        // High elevation: mountain or rock
        tile = detail > 0.5 ? TileType.MOUNTAIN : TileType.ROCK;
      } else if (elevation > forestDensity + 0.1 && biomeVal > 0.4) {
        // Forest areas (on higher ground, with biome variation)
        tile = detail > 0.5 ? TileType.FOREST : TileType.DARK_GRASS;
      } else if (elevation > forestDensity && biomeVal > 0.5) {
        // Sparse forest / dark grass transition
        tile = TileType.DARK_GRASS;
      } else {
        // Default grassland
        tile = detail > 0.6 ? TileType.DARK_GRASS : TileType.GRASS;
      }

      tiles[y][x] = tile;
    }
  }

  return {
    width,
    height,
    tiles,
    pathNodes: [],
    seed,
  };
}

/**
 * Applies 1 pass of cellular automata smoothing:
 * If a tile is surrounded by a different dominant biome type, it flips.
 * This removes single-tile noise artifacts.
 */
export function smoothTerrain(level: LevelData): void {
  const { width, height, tiles } = level;
  const output: TileType[][] = tiles.map(row => [...row]);

  const waterTypes = new Set([TileType.WATER, TileType.SAND]);
  const forestTypes = new Set([TileType.FOREST, TileType.DARK_GRASS]);
  const mountainTypes = new Set([TileType.MOUNTAIN, TileType.ROCK]);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tile = tiles[y][x];
      const neighbors = getNeighborTiles(tiles, x, y);

      // Count neighbors by biome category
      const waterCount = neighbors.filter(n => waterTypes.has(n)).length;
      const forestCount = neighbors.filter(n => forestTypes.has(n)).length;
      const mountainCount = neighbors.filter(n => mountainTypes.has(n)).length;
      const grassCount = neighbors.filter(n => n === TileType.GRASS || n === TileType.DARK_GRASS).length;

      // If isolated water tile surrounded by land → flip to grass
      if (waterTypes.has(tile) && waterCount <= 1 && grassCount >= 5) {
        output[y][x] = TileType.GRASS;
      }
      // If isolated forest tile surrounded by grass → flip to grass
      else if (tile === TileType.FOREST && forestCount <= 1 && grassCount >= 5) {
        output[y][x] = TileType.GRASS;
      }
      // If isolated grass tile surrounded by forest → flip to forest
      else if (tile === TileType.GRASS && grassCount <= 1 && forestCount >= 5) {
        output[y][x] = TileType.DARK_GRASS;
      }
      // If isolated mountain surrounded by grass → downgrade to rock
      else if (tile === TileType.MOUNTAIN && mountainCount <= 1 && grassCount >= 4) {
        output[y][x] = TileType.ROCK;
      }
    }
  }

  // Copy back
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles[y][x] = output[y][x];
    }
  }
}

function getNeighborTiles(tiles: TileType[][], x: number, y: number): TileType[] {
  const neighbors: TileType[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      neighbors.push(tiles[y + dy][x + dx]);
    }
  }
  return neighbors;
}