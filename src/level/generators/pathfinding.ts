import { TileType, Point, GeneratorParams } from '../core/types';

// Terrain cost multipliers
const TERRAIN_COST: Record<number, number> = {
  [TileType.GRASS]: 1.0,
  [TileType.DARK_GRASS]: 1.3,
  [TileType.FOREST]: 2.5,
  [TileType.SAND]: 1.2,
  [TileType.ROCK]: 3.0,
  [TileType.PATH]: 1.0,
  [TileType.CLEARING]: 1.0,
  [TileType.RUINS]: 1.5,
};

// Tile types that block pathfinding entirely
const BLOCKED_TILES = new Set([
  TileType.WATER,
  TileType.MOUNTAIN,
  TileType.VOID,
]);

// 8-direction offsets: N, NE, E, SE, S, SW, W, NW
const DIR_OFFSETS: Array<{ dx: number; dy: number; cost: number }> = [
  { dx: 0, dy: -1, cost: 1.0 },
  { dx: 1, dy: -1, cost: 1.414 },
  { dx: 1, dy: 0, cost: 1.0 },
  { dx: 1, dy: 1, cost: 1.414 },
  { dx: 0, dy: 1, cost: 1.0 },
  { dx: -1, dy: 1, cost: 1.414 },
  { dx: -1, dy: 0, cost: 1.0 },
  { dx: -1, dy: -1, cost: 1.414 },
];

/**
 * Simple binary min-heap for A* open set.
 */
class MinHeap<T> {
  private heap: Array<{ key: number; value: T }> = [];

  push(key: number, value: T): void {
    this.heap.push({ key, value });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0 && bottom) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top.value;
  }

  get size(): number {
    return this.heap.length;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.heap[parent].key <= this.heap[idx].key) break;
      [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
      idx = parent;
    }
  }

  private sinkDown(idx: number): void {
    const len = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = (idx << 1) + 1;
      const right = left + 1;
      if (left < len && this.heap[left].key < this.heap[smallest].key) smallest = left;
      if (right < len && this.heap[right].key < this.heap[smallest].key) smallest = right;
      if (smallest === idx) break;
      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}

/**
 * Seeded hash for noise perturbation on path costs.
 * Deterministic per (x, y, seed) so the same seed produces the same paths.
 */
function tileHash(x: number, y: number, seed: number): number {
  let h = (seed * 374761393 + x * 668265263 + y * 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967296;
}

/**
 * Heuristic: Chebyshev distance (max of dx, dy) — works well with 8-direction movement.
 */
function heuristic(a: Point, b: Point): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy);
}

/**
 * Encodes (x, y) to a single integer key for map lookups.
 */
function key(x: number, y: number): number {
  return (y << 16) | x;
}

/**
 * Finds a terrain-aware path between start and end points using A*.
 * Considers terrain costs, slope, height, and optional switchback behavior.
 *
 * Returns an array of Points forming the path (including start and end),
 * or an empty array if no path is found.
 */
export function findPath(
  start: Point,
  end: Point,
  tiles: TileType[][],
  slopeMap: number[][],
  heightMap: number[][],
  params: GeneratorParams,
): Point[] {
  const { width, height, seed, switchback } = params;

  const slopePenaltyFactor = 2.0;

  // Check if start or end is blocked (edge case)
  if (isBlocked(tiles, start.x, start.y)) return [];
  if (isBlocked(tiles, end.x, end.y)) return [];

  const openSet = new MinHeap<number>();
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();

  const startKey = key(start.x, start.y);
  const endKey = key(end.x, end.y);

  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, end));
  openSet.push(fScore.get(startKey)!, startKey);

  // Track visited to avoid re-expanding
  const visited = new Set<number>();

  while (openSet.size > 0) {
    const current = openSet.pop()!;
    if (current === endKey) {
      return reconstructPath(cameFrom, current, width, height);
    }

    if (visited.has(current)) continue;
    visited.add(current);

    const cx = current & 0xffff;
    const cy = (current >> 16) & 0xffff;

    for (const dir of DIR_OFFSETS) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;

      // Bounds check
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const neighborKey = key(nx, ny);
      if (visited.has(neighborKey)) continue;

      // Check if tile is blocked
      if (isBlocked(tiles, nx, ny)) continue;

      // --- Cost calculation ---
      // Base terrain cost
      const terrainCost = TERRAIN_COST[tiles[ny][nx]] ?? 2.0;

      // Slope cost
      const slope = slopeMap[ny][nx];
      const slopeCost = 1.0 + slope * slopePenaltyFactor;

      // Noise perturbation (±15% variation) to prevent perfectly identical paths
      const noiseVal = tileHash(nx, ny, seed + 100);
      const noiseCost = 1.0 + (noiseVal - 0.5) * 0.3; // 0.85 to 1.15

      // Movement cost for this step
      let moveCost = dir.cost * terrainCost * slopeCost * noiseCost;

      // Switchback behavior: if enabled and slope is significant,
      // add extra cost for going directly uphill
      if (switchback && slope > 0.3) {
        const currentElev = heightMap[ny]?.[nx] ?? 0;
        const parentElev = heightMap[cy]?.[cx] ?? 0;
        const heightDiff = currentElev - parentElev;

        // If moving uphill on steep terrain, add significant cost
        // This encourages the path to traverse along contour lines (zigzag)
        if (heightDiff > 0.02) {
          moveCost *= 1.0 + slope * 2.0;
        }
      }

      const tentativeG = (gScore.get(current) ?? 0) + moveCost;

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        const h = heuristic({ x: nx, y: ny }, end);
        const f = tentativeG + h;
        fScore.set(neighborKey, f);
        openSet.push(f, neighborKey);
      }
    }
  }

  // No path found — return empty
  return [];
}

/**
 * Reconstructs the path from the cameFrom map.
 */
function reconstructPath(
  cameFrom: Map<number, number>,
  current: number,
  _width: number,
  _height: number,
): Point[] {
  const path: Point[] = [];
  let node = current;
  while (cameFrom.has(node)) {
    const x = node & 0xffff;
    const y = (node >> 16) & 0xffff;
    path.push({ x, y });
    node = cameFrom.get(node)!;
  }
  // Add start node
  const startX = node & 0xffff;
  const startY = (node >> 16) & 0xffff;
  path.push({ x: startX, y: startY });

  // Reverse to get start → end order
  path.reverse();
  return path;
}

/**
 * Returns true if a tile is blocked (cannot path through).
 */
function isBlocked(tiles: TileType[][], x: number, y: number): boolean {
  return BLOCKED_TILES.has(tiles[y][x]);
}

/**
 * Simplifies a path by removing collinear waypoints (angle-based simplification).
 */
export function simplifyPath(path: Point[]): Point[] {
  if (path.length <= 2) return path;

  const simplified: Point[] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Check if removing curr preserves the direction
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Keep point if direction changes (not collinear)
    if (dx1 !== dx2 || dy1 !== dy2) {
      simplified.push(curr);
    }
  }

  simplified.push(path[path.length - 1]);
  return simplified;
}