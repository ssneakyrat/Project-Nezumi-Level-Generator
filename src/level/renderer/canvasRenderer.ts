import { LevelData, TileType, TILE_COLORS } from '../core/types';

/**
 * Seeded hash for deterministic cobblestone patterns per tile.
 */
function tileHash(x: number, y: number, seed: number): number {
  let h = (seed * 374761393 + x * 668265263 + y * 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967296;
}

/**
 * Renders a LevelData object to an HTML Canvas element.
 * Each tile is drawn as a colored rectangle using the TILE_COLORS palette.
 * PATH tiles receive a cobblestone texture pattern.
 */
export function renderLevelToCanvas(
  level: LevelData,
  tileSize: number = 16,
  showNodes: boolean = false,
  nodeFontSize: number = 8,
): HTMLCanvasElement {
  const { width, height, tiles, pathNodes, seed } = level;

  const canvas = document.createElement('canvas');
  canvas.width = width * tileSize;
  canvas.height = height * tileSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas 2D context');

  // Draw each tile
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x];
      const color = TILE_COLORS[tile] || TILE_COLORS[TileType.VOID];
      ctx.fillStyle = color;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

      // Apply cobblestone texture for PATH tiles
      if (tile === TileType.PATH && tileSize >= 4) {
        renderCobblestoneTexture(ctx, x, y, tileSize, seed);
      }
    }
  }

  // Optionally overlay path node markers
  if (showNodes && pathNodes.length > 0) {
    for (const node of pathNodes) {
      const cx = node.position.x * tileSize + tileSize / 2;
      const cy = node.position.y * tileSize + tileSize / 2;

      // Draw connections (paths)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      for (const targetId of node.connectedTo) {
        const target = pathNodes[targetId];
        if (!target) continue;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          target.position.x * tileSize + tileSize / 2,
          target.position.y * tileSize + tileSize / 2,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Draw node marker
      if (node.isPOI) {
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = `${nodeFontSize}px monospace`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = nodeFontSize > 12 ? 3 : 2;
        ctx.strokeText(node.label, cx + nodeFontSize * 0.6, cy);
        ctx.fillText(node.label, cx + nodeFontSize * 0.6, cy);
      } else {
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return canvas;
}

/**
 * Renders a cobblestone texture pattern on a PATH tile.
 * Uses a deterministic hash based on (x, y, seed) so the pattern
 * is consistent across regenerations with the same seed.
 */
function renderCobblestoneTexture(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tileSize: number,
  seed: number,
): void {
  const px = tileX * tileSize;
  const py = tileY * tileSize;

  // Draw a darker border around the tile (individual stone effect)
  const borderColor = '#6a5a3a';
  ctx.fillStyle = borderColor;
  ctx.fillRect(px, py, tileSize, 1); // top
  ctx.fillRect(px, py + tileSize - 1, tileSize, 1); // bottom
  ctx.fillRect(px, py, 1, tileSize); // left
  ctx.fillRect(px + tileSize - 1, py, 1, tileSize); // right

  // Draw internal cobblestone cracks/patterns
  const hash1 = tileHash(tileX, tileY, seed);
  const hash2 = tileHash(tileX + 100, tileY + 100, seed);
  const hash3 = tileHash(tileX + 200, tileY + 200, seed);

  ctx.fillStyle = '#5a4a2a';

  if (tileSize >= 8) {
    // Draw a small stone-like rectangle in each quadrant
    const quarter = Math.max(2, Math.floor(tileSize / 4));
    const half = Math.floor(tileSize / 2);

    // 1st quadrant stone
    if (hash1 > 0.3) {
      const sx = px + 1 + Math.floor(hash1 * (half - 3));
      const sy = py + 1 + Math.floor(hash2 * (half - 3));
      const sw = 2 + Math.floor(hash3 * (quarter - 1));
      const sh = 2 + Math.floor((1 - hash1) * (quarter - 1));
      ctx.fillRect(sx, sy, sw, sh);
    }

    // 2nd quadrant stone
    if (hash2 > 0.4) {
      const sx = px + half + 1 + Math.floor((1 - hash2) * (half - 3));
      const sy = py + 1 + Math.floor(hash1 * (half - 3));
      const sw = 2 + Math.floor((1 - hash1) * (quarter - 1));
      const sh = 2 + Math.floor(hash3 * (quarter - 1));
      ctx.fillRect(sx, sy, sw, sh);
    }

    // 3rd quadrant stone
    if (hash3 > 0.4) {
      const sx = px + 1 + Math.floor(hash3 * (half - 3));
      const sy = py + half + 1 + Math.floor((1 - hash3) * (half - 3));
      const sw = 2 + Math.floor(hash2 * (quarter - 1));
      const sh = 2 + Math.floor((1 - hash2) * (quarter - 1));
      ctx.fillRect(sx, sy, sw, sh);
    }

    // 4th quadrant stone
    if ((hash1 + hash2 + hash3) / 3 > 0.3) {
      const sx = px + half + 1 + Math.floor(hash1 * (half - 3));
      const sy = py + half + 1 + Math.floor(hash2 * (half - 3));
      const sw = 2 + Math.floor((1 - hash3) * (quarter - 1));
      const sh = 2 + Math.floor(hash3 * (quarter - 1));
      ctx.fillRect(sx, sy, sw, sh);
    }

    // Draw random crack lines
    ctx.strokeStyle = '#4a3a1a';
    ctx.lineWidth = 1;
    if (hash1 > 0.6) {
      ctx.beginPath();
      ctx.moveTo(px + Math.floor(hash1 * tileSize), py);
      ctx.lineTo(px + Math.floor(hash2 * tileSize), py + tileSize - 1);
      ctx.stroke();
    }
    if (hash2 > 0.5) {
      ctx.beginPath();
      ctx.moveTo(px, py + Math.floor(hash2 * tileSize));
      ctx.lineTo(px + tileSize - 1, py + Math.floor(hash3 * tileSize));
      ctx.stroke();
    }
  } else {
    // Small tile size: simpler pattern — just a few dots
    for (let i = 0; i < 3; i++) {
      const dx = Math.floor(tileHash(tileX + i * 50, tileY + i * 50, seed) * (tileSize - 2)) + 1;
      const dy = Math.floor(tileHash(tileX + i * 50 + 1, tileY + i * 50 + 1, seed) * (tileSize - 2)) + 1;
      ctx.fillRect(px + dx, py + dy, 1, 1);
    }
  }
}

/**
 * Exports the rendered level canvas to a PNG Blob.
 */
export function exportLevelAsPNG(level: LevelData, tileSize: number = 16): Promise<Blob | null> {
  const canvas = renderLevelToCanvas(level, tileSize, false);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Exports the level as a data URL (for use in <img> tags or downloading).
 */
export function exportLevelAsDataURL(level: LevelData, tileSize: number = 16): string {
  const canvas = renderLevelToCanvas(level, tileSize, false);
  return canvas.toDataURL('image/png');
}

/**
 * Triggers a download of the level image as a PNG file.
 */
export function downloadLevelPNG(level: LevelData, tileSize: number = 16, filename?: string): void {
  const canvas = renderLevelToCanvas(level, tileSize, false);
  const link = document.createElement('a');
  link.download = filename || `level-${level.seed}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}