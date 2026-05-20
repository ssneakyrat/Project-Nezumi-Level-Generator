export enum TileType {
  VOID = 0,
  GRASS = 1,
  DARK_GRASS = 2,
  FOREST = 3,
  WATER = 4,
  SAND = 5,
  ROCK = 6,
  MOUNTAIN = 7,
  PATH = 8,
  CLEARING = 9,
  RUINS = 10,
}

export enum Biome {
  GRASSLAND = 'grassland',
  FOREST = 'forest',
  WATER = 'water',
  SAND = 'sand',
  ROCKY = 'rocky',
  MOUNTAIN = 'mountain',
}

export interface Point {
  x: number;
  y: number;
}

export interface PathNode {
  id: number;
  position: Point;
  label: string;
  connectedTo: number[];
  isPOI: boolean;
  poiType?: 'clearing' | 'ruins' | 'shrine' | 'campsite';
}

export interface LevelData {
  width: number;
  height: number;
  tiles: TileType[][]; // tiles[y][x]
  heightMap: number[][]; // elevation in [0,1] per tile
  pathNodes: PathNode[];
  seed: number;
}

export interface GeneratorParams {
  width: number;
  height: number;
  tileSize: number;
  seed: number;
  pathDensity: number; // 0.0 - 1.0
  forestDensity: number; // 0.0 - 1.0
  waterLevel: number; // 0.0 - 1.0
  mountainLevel: number; // 0.0 - 1.0
  pathWidth: number; // 1-5, width of roads
  switchback: boolean; // enable switchback (zigzag) paths on steep terrain
}

export const DEFAULT_PARAMS: GeneratorParams = {
  width: 80,
  height: 60,
  tileSize: 16,
  seed: Date.now(),
  pathDensity: 0.5,
  forestDensity: 0.4,
  waterLevel: 0.45,
  mountainLevel: 0.7,
  pathWidth: 2,
  switchback: false,
};

export const TILE_COLORS: Record<TileType, string> = {
  [TileType.VOID]: '#000000',
  [TileType.GRASS]: '#4a7c3f',
  [TileType.DARK_GRASS]: '#3d6b34',
  [TileType.FOREST]: '#2d5a27',
  [TileType.WATER]: '#3a6ea5',
  [TileType.SAND]: '#d4b87a',
  [TileType.ROCK]: '#6b6b6b',
  [TileType.MOUNTAIN]: '#4a4a4a',
  [TileType.PATH]: '#8a7a5a',
  [TileType.CLEARING]: '#5a8c4a',
  [TileType.RUINS]: '#7a6a5a',
};