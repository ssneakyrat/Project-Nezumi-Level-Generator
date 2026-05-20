import { LevelData, TileType, TILE_COLORS } from '../core/types';

/**
 * Renders a LevelData object to an HTML Canvas element.
 * Each tile is drawn as a colored rectangle using the TILE_COLORS palette.
 */
export function renderLevelToCanvas(
  level: LevelData,
  tileSize: number = 16,
  showNodes: boolean = false,
  nodeFontSize: number = 8,
): HTMLCanvasElement {
  const { width, height, tiles, pathNodes } = level;

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