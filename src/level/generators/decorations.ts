import { TileType, LevelData, GeneratorParams } from '../core/types';

/**
 * Post-processing step: adds decorative tiles to enhance visual variety.
 * - Adds scattered FOREST tiles in DARK_GRASS areas
 * - Adds small clusters of ROCKS near MOUNTAIN areas
 * - Adds small bush details (alternating GRASS/DARK_GRASS) in open areas
 */
export function generateDecorations(level: LevelData, params: GeneratorParams): void {
  const { width, height, seed, forestDensity } = params;

  // Seeded PRNG
  let s = seed + 200;
  const rand = (): number => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };

  const tiles = level.tiles;

  // 1. Add tree clusters in DARK_GRASS areas (dense forest patches)
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (tiles[y][x] === TileType.DARK_GRASS) {
        // Check surrounding tiles: if enough dark grass, grow a forest tile
        let darkCount = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (tiles[y + dy]?.[x + dx] === TileType.DARK_GRASS ||
                tiles[y + dy]?.[x + dx] === TileType.FOREST) {
              darkCount++;
            }
          }
        }
        // Probability scales with forest density and surrounding dark tiles
        const prob = (darkCount / 24) * forestDensity;
        if (rand() < prob * 0.6) {
          tiles[y][x] = TileType.FOREST;
        }
      }
    }
  }

  // 2. Add rocks near mountain/rock transition zones
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (tiles[y][x] === TileType.ROCK) {
        // Maybe add a small rock cluster nearby
        for (let i = 0; i < 2; i++) {
          const rx = x + Math.floor(rand() * 5) - 2;
          const ry = y + Math.floor(rand() * 5) - 2;
          if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
            if (tiles[ry][rx] === TileType.GRASS && rand() < 0.3) {
              tiles[ry][rx] = TileType.ROCK;
            }
          }
        }
      }
    }
  }

  // 3. Add scattered single rocks on grassland (far from paths)
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (tiles[y][x] === TileType.GRASS && rand() < 0.02) {
        // Don't place if adjacent to path
        let nearPath = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (tiles[y + dy]?.[x + dx] === TileType.PATH) {
              nearPath = true;
            }
          }
        }
        if (!nearPath) {
          tiles[y][x] = TileType.ROCK;
        }
      }
    }
  }

  // 4. Add small grass detail variation (alternate grass <-> dark grass)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] === TileType.GRASS) {
        const detailVal = rand();
        if (detailVal < 0.05) {
          tiles[y][x] = TileType.DARK_GRASS;
        }
      }
    }
  }
}