// Seeded PRNG (mulberry32). The generator state is a uint32 kept in State, so a tick is pure.
export function next(stateU32: number): [number, number] {
  const a = (stateU32 + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** A stateful view over a uint32 seed; read `.state` back after use. */
export class Rng {
  constructor(public state: number) {}
  uniform(): number {
    const [u, s] = next(this.state);
    this.state = s;
    return u;
  }
  normal(): number {
    const u = Math.max(1e-12, this.uniform());
    const v = this.uniform();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do { k++; p *= this.uniform(); } while (p > L && k < 1000);
    return k - 1;
  }
}

export function seedToState(seed: number): number {
  // Scramble so seeds 0, 1, 2 give unrelated streams.
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
