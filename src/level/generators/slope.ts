/**
 * Computes a slope map from the height map using a Sobel operator.
 * Returns a 2D array where values represent the steepness [0, 1].
 * 0 = perfectly flat, 1 = very steep.
 */
export function computeSlope(heightMap: number[][]): number[][] {
  const height = heightMap.length;
  if (height === 0) return [];
  const width = heightMap[0].length;

  const slope: number[][] = [];

  for (let y = 0; y < height; y++) {
    slope[y] = [];
    for (let x = 0; x < width; x++) {
      // Sobel kernels
      // Gx: gradient in x-direction
      let gx = 0;
      // Gy: gradient in y-direction
      let gy = 0;

      // 3x3 neighborhood
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          // Clamp to map boundaries
          const clampedX = Math.max(0, Math.min(width - 1, nx));
          const clampedY = Math.max(0, Math.min(height - 1, ny));

          const val = heightMap[clampedY][clampedX];

          // Sobel weights for x gradient
          // [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
          const wx = dx === -1 ? -1 : dx === 1 ? 1 : 0;
          const wy = dy === -1 ? -1 : dy === 1 ? 1 : 0;
          // Weight for center row is 2x in Sobel
          const gxWeight = dy === 0 ? wx * 2 : wx;
          const gyWeight = dx === 0 ? wy * 2 : wy;

          gx += val * gxWeight;
          gy += val * gyWeight;
        }
      }

      // Magnitude of gradient = sqrt(gx^2 + gy^2)
      // Normalize: max possible Sobel output for values in [0,1] is ~4.24
      // (with 8-bit normalized, ~4.24 is the theoretical max from edge response)
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      // Clamp to [0, 1]
      slope[y][x] = Math.min(1, magnitude / 2.0);
    }
  }

  return slope;
}