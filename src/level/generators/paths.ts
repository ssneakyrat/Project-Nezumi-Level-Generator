import { TileType, LevelData, GeneratorParams, PathNode, Point } from '../core/types';

/**
 * Places POI (Points of Interest) nodes and generates branching paths between them.
 * Paths are carved into the terrain by finding walkable routes.
 */
export function generatePaths(level: LevelData, params: GeneratorParams): void {
  const { width, height, seed, pathDensity } = params;

  // Seeded PRNG for reproducible path generation
  let s = seed + 100;
  const rand = (): number => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };

  // 1. Determine number of POIs based on density and map size
  const area = width * height;
  const poiCount = Math.max(3, Math.floor(area / 600 * pathDensity));

  // 2. Find valid positions for POIs (not on water or mountains)
  const validPositions: Point[] = [];
  for (let y = 3; y < height - 3; y += 2) {
    for (let x = 3; x < width - 3; x += 2) {
      const tile = level.tiles[y][x];
      if (tile !== TileType.WATER && tile !== TileType.MOUNTAIN) {
        validPositions.push({ x, y });
      }
    }
  }

  // Shuffle valid positions using our seeded RNG
  for (let i = validPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
  }

  // 3. Select POI positions
  const selectedCount = Math.min(poiCount, validPositions.length);
  const selectedPositions = validPositions.slice(0, selectedCount);

  // 4. Create PathNode objects
  const poiTypes: Array<'clearing' | 'ruins' | 'shrine' | 'campsite'> = [
    'clearing', 'ruins', 'shrine', 'campsite',
  ];

  const pathNodes: PathNode[] = selectedPositions.map((pos, i) => ({
    id: i,
    position: pos,
    label: i === 0 ? 'Entrance' : `${poiTypes[i % poiTypes.length]} ${Math.floor(i / poiTypes.length) + 1}`,
    connectedTo: [],
    isPOI: true,
    poiType: i === 0 ? 'clearing' : poiTypes[i % poiTypes.length],
  }));

  // 5. Build the branching path graph
  // Start from node 0 (entrance), then connect each subsequent node
  // to the nearest already-connected node (minimum spanning tree approach)
  const connected = new Set<number>();
  connected.add(0);

  for (let i = 1; i < pathNodes.length; i++) {
    // Find the closest connected node
    let bestDist = Infinity;
    let bestConnectedId = -1;

    for (const connectedId of connected) {
      const dx = pathNodes[i].position.x - pathNodes[connectedId].position.x;
      const dy = pathNodes[i].position.y - pathNodes[connectedId].position.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestConnectedId = connectedId;
      }
    }

    // Connect both ways
    if (bestConnectedId >= 0) {
      pathNodes[i].connectedTo.push(bestConnectedId);
      pathNodes[bestConnectedId].connectedTo.push(i);
      connected.add(i);
    }
  }

  // 6. Add extra branches (dead-end spurs) based on density
  const spurCount = Math.floor(poiCount * pathDensity * 0.5);
  for (let i = 0; i < spurCount && pathNodes.length < 15; i++) {
    // Pick an existing node to branch from
    const parentIndex = Math.floor(rand() * pathNodes.length);
    // Pick a direction and distance
    const angle = rand() * Math.PI * 2;
    const dist = 5 + rand() * 12;
    const sx = Math.round(pathNodes[parentIndex].position.x + Math.cos(angle) * dist);
    const sy = Math.round(pathNodes[parentIndex].position.y + Math.sin(angle) * dist);

    // Check if valid position
    if (sx >= 2 && sx < width - 2 && sy >= 2 && sy < height - 2) {
      const tile = level.tiles[sy][sx];
      if (tile !== TileType.WATER && tile !== TileType.MOUNTAIN) {
        const newNode: PathNode = {
          id: pathNodes.length,
          position: { x: sx, y: sy },
          label: `Spur ${i + 1}`,
          connectedTo: [parentIndex],
          isPOI: false,
        };
        pathNodes[parentIndex].connectedTo.push(newNode.id);
        pathNodes.push(newNode);
      }
    }
  }

  level.pathNodes = pathNodes;

  // 7. Carve paths between connected nodes
  for (const node of pathNodes) {
    for (const targetId of node.connectedTo) {
      if (targetId > node.id) continue; // Only carve each pair once

      const start = node.position;
      const end = pathNodes[targetId].position;
      carvePath(level.tiles, start, end, width, height);
    }
  }
}

/**
 * Carves an L-shaped path between two points through walkable terrain.
 * First moves horizontally from start.x to end.x, then vertically from start.y to end.y.
 */
function carvePath(
  tiles: TileType[][],
  start: Point,
  end: Point,
  width: number,
  height: number,
): void {
  const walkable = new Set([
    TileType.GRASS,
    TileType.DARK_GRASS,
    TileType.FOREST,
    TileType.SAND,
    TileType.ROCK,
    TileType.PATH,
    TileType.CLEARING,
  ]);

  // Mark a tile as path (only convert natural terrain tiles, not water/mountain)
  const markPath = (x: number, y: number): void => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const t = tiles[y][x];
      if (t === TileType.GRASS || t === TileType.DARK_GRASS || t === TileType.SAND) {
        tiles[y][x] = TileType.PATH;
      }
    }
  };

  // Mark a 3x3 POI clearing
  const markPOI = (x: number, y: number): void => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
          if (walkable.has(tiles[cy][cx])) {
            tiles[cy][cx] = TileType.CLEARING;
          }
        }
      }
    }
  };

  // Mark POI at start and end
  markPOI(start.x, start.y);
  markPOI(end.x, end.y);

  // Safety max iterations to prevent any infinite loops
  const maxSteps = width + height;

  // Phase 1: Walk horizontally from start.x to end.x at start.y
  const hStep = end.x >= start.x ? 1 : -1;
  let steps = 0;
  let cx = start.x;
  while (cx !== end.x && steps < maxSteps) {
    markPath(cx, start.y);
    cx += hStep;
    steps++;
  }

  // Phase 2: Walk vertically from start.y to end.y at end.x
  const vStep = end.y >= start.y ? 1 : -1;
  steps = 0;
  let cy = start.y;
  while (cy !== end.y && steps < maxSteps) {
    markPath(end.x, cy);
    cy += vStep;
    steps++;
  }

  // Ensure endpoint is marked
  markPath(end.x, end.y);
  markPath(start.x, start.y);
}
