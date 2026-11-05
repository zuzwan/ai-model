// The two traces on the model envelope: alignment_to_usage and alignment_to_usefulness over time.
// Their divergence is the gap G, readable at the boundary where usefulness is judged.
import * as THREE from 'three';
import { ontology } from '../sim/ontology';
import style from './style.json';

export class Traces {
  readonly group = new THREE.Group();
  private lines: { line: THREE.Line; pos: Float32Array; face: number }[] = [];
  private mats: THREE.LineBasicMaterial[] = [];
  private box: { x0: number; x1: number; y0: number; y1: number; zf: number; zb: number };

  constructor() {
    const env = ontology.envelopes.find((e) => e.id === 'model')!.layout;
    const T = style.traces;
    this.box = {
      x0: env.x - env.w / 2 + T.inset, x1: env.x + env.w / 2 - T.inset,
      y0: env.y - env.h / 2 + T.inset, y1: env.y + env.h / 2 - T.inset,
      zf: env.z + env.d / 2 + 0.002, zb: env.z - env.d / 2 - 0.002,
    };
    for (const color of [T.usage, T.usefulness]) {
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 });
      this.mats.push(m);
      for (const face of [1, -1]) {
        const pos = new Float32Array(T.window * 3);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
        g.setDrawRange(0, 0);
        const line = new THREE.Line(g, m);
        line.frustumCulled = false;
        this.lines.push({ line, pos, face });
        this.group.add(line);
      }
    }
  }

  /** Series of A_u and A_v ending at the current tick. */
  set(au: number[], av: number[]) {
    const W = style.traces.window;
    const { x0, x1, y0, y1, zf, zb } = this.box;
    this.lines.forEach((l, i) => {
      const src = i < 2 ? au : av;
      const n = Math.min(W, src.length);
      const start = src.length - n;
      for (let k = 0; k < n; k++) {
        // Front face reads left to right; the back face is mirrored so it also reads left to right.
        const fx = (W - n + k) / (W - 1);
        const x = l.face > 0 ? x0 + fx * (x1 - x0) : x1 - fx * (x1 - x0);
        l.pos[k * 3] = x;
        l.pos[k * 3 + 1] = y0 + src[start + k] * (y1 - y0);
        l.pos[k * 3 + 2] = l.face > 0 ? zf : zb;
      }
      l.line.geometry.setDrawRange(0, n);
      l.line.geometry.attributes.position.needsUpdate = true;
    });
  }

  setOpacity(a: number) { for (const m of this.mats) m.opacity = a; }
}
