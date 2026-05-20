// A seeded 2D noise implementation using a permutation table (similar to Perlin/Simplex).
// Provides smooth, natural-looking terrain height values in [0, 1].

function buildPermutationTable(seed: number): Uint8Array {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  // Seed-based shuffle using a simple mulberry32 PRNG
  let s = seed | 0;
  const nextRand = (): number => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };

  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }
  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
  }
  return perm;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export class Noise2D {
  private perm: Uint8Array;

  constructor(seed: number) {
    this.perm = buildPermutationTable(seed);
  }

  /**
   * Returns a noise value in [0, 1] for the given (x, y) coordinate.
   * Uses 2D Perlin noise internally.
   */
  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const g1 = grad(aa, xf, yf);
    const g2 = grad(ba, xf - 1, yf);
    const g3 = grad(ab, xf, yf - 1);
    const g4 = grad(bb, xf - 1, yf - 1);

    const l1 = lerp(g1, g2, u);
    const l2 = lerp(g3, g4, u);
    const result = lerp(l1, l2, v);

    // Normalize from [-1, 1] to [0, 1]
    return (result + 1) / 2;
  }

  /**
   * Octave noise: sums multiple noise layers at different frequencies/amplitudes.
   * Produces more detailed, natural terrain.
   */
  octaveNoise(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }
}