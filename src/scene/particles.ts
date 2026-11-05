// One particle system per substance. Particles are emitted at the head of a flow's conduit at a
// rate proportional to the flow, travel at the substance's constant speed and die at the tail.
import * as THREE from 'three';
import type { Substance } from '../sim/ontology';
import style from './style.json';

const vert = /* glsl */ `
  attribute float alpha;
  uniform float uSize;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, uSize * uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    gl_FragColor = vec4(uColor, uOpacity * vAlpha);
    #include <colorspace_fragment>
  }
`;

export function pointsMaterial(color: string, size: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uScale: { value: 400 },
      uOpacity: { value: 1 },
    },
  });
}

export interface Track { id: string; lut: Float32Array; samples: number; length: number; model: boolean }

export function makeTrack(id: string, curve: THREE.Curve<THREE.Vector3>, model: boolean): Track {
  const samples = style.particles.lutSamples;
  const lut = new Float32Array((samples + 1) * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    curve.getPointAt(i / samples, v);
    lut.set([v.x, v.y, v.z], i * 3);
  }
  return { id, lut, samples, length: curve.getLength(), model };
}

export class FlowParticles {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private pos: Float32Array;
  private alpha: Float32Array;
  private track: Int16Array;
  private u: Float32Array;
  private n = 0;
  private tracks: Track[] = [];
  private acc: number[] = [];
  private frozen: boolean[] = [];
  /** Per-track dimming (Umwelt view, deprecation), 0..1 multiplier on alpha. */
  private trackAlpha: number[] = [];

  constructor(readonly substance: Substance) {
    const cap = substance.particle.cap;
    this.pos = new Float32Array(cap * 3);
    this.alpha = new Float32Array(cap);
    this.track = new Int16Array(cap);
    this.u = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.material = pointsMaterial(substance.particle.color, substance.particle.size);
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  addTrack(t: Track): number {
    this.tracks.push(t);
    this.acc.push(Math.random());
    this.frozen.push(false);
    this.trackAlpha.push(1);
    return this.tracks.length - 1;
  }

  setFrozen(i: number, f: boolean) { this.frozen[i] = f; }
  setTrackAlpha(i: number, a: number) { this.trackAlpha[i] = a; }
  clear() { this.n = 0; this.acc = this.acc.map(() => Math.random()); }

  /** Emit `count` (fractional) particles on track i, spread over the elapsed time `dt` seconds. */
  emit(i: number, count: number, dt: number) {
    this.acc[i] += count;
    const cap = this.substance.particle.cap;
    const du = this.substance.particle.speed / this.tracks[i].length;
    while (this.acc[i] >= 1) {
      this.acc[i] -= 1;
      if (this.n >= cap) continue;
      const k = this.n++;
      this.track[k] = i;
      // Spread emissions across the frame so streams look continuous.
      this.u[k] = Math.random() * du * dt;
    }
  }

  advance(dt: number) {
    const speed = this.substance.particle.speed;
    let k = 0;
    while (k < this.n) {
      const ti = this.track[k];
      if (!this.frozen[ti]) this.u[k] += (speed / this.tracks[ti].length) * dt;
      if (this.u[k] >= 1) {
        const last = --this.n;
        this.track[k] = this.track[last];
        this.u[k] = this.u[last];
        continue;
      }
      k++;
    }
  }

  write() {
    for (let k = 0; k < this.n; k++) {
      const t = this.tracks[this.track[k]];
      const f = this.u[k] * t.samples;
      const i = Math.min(t.samples - 1, Math.floor(f));
      const r = f - i;
      const a = i * 3;
      const b = a + 3;
      this.pos[k * 3] = t.lut[a] + (t.lut[b] - t.lut[a]) * r;
      this.pos[k * 3 + 1] = t.lut[a + 1] + (t.lut[b + 1] - t.lut[a + 1]) * r;
      this.pos[k * 3 + 2] = t.lut[a + 2] + (t.lut[b + 2] - t.lut[a + 2]) * r;
      // Fade in and out at the ends of the conduit.
      const edge = Math.min(1, this.u[k] / 0.04, (1 - this.u[k]) / 0.04);
      this.alpha[k] = edge * this.trackAlpha[this.track[k]];
    }
    const g = this.points.geometry;
    g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = true;
    g.attributes.alpha.needsUpdate = true;
  }

  get count() { return this.n; }
}

/** Heat: faint grey particles rising from a source box and fading within one chamber height. */
export class HeatParticles {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private pos: Float32Array;
  private alpha: Float32Array;
  private base: Float32Array;
  private life: Float32Array;
  private rise: Float32Array;
  private n = 0;
  private acc: number[] = [];

  constructor(readonly sources: { center: THREE.Vector3; w: number; d: number; h: number }[], readonly sub: Substance) {
    const cap = sub.particle.cap;
    this.pos = new Float32Array(cap * 3);
    this.alpha = new Float32Array(cap);
    this.base = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.rise = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = pointsMaterial(sub.particle.color, sub.particle.size);
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.acc = sources.map(() => 0);
  }

  clear() { this.n = 0; }

  emit(i: number, count: number) {
    this.acc[i] += count;
    const s = this.sources[i];
    while (this.acc[i] >= 1) {
      this.acc[i] -= 1;
      if (this.n >= this.sub.particle.cap) continue;
      const k = this.n++;
      this.base[k * 3] = s.center.x + (Math.random() - 0.5) * s.w;
      this.base[k * 3 + 1] = s.center.y + s.h / 2;
      this.base[k * 3 + 2] = s.center.z + (Math.random() - 0.5) * s.d;
      this.life[k] = 0;
      this.rise[k] = s.h;
    }
  }

  advance(dt: number) {
    const speed = this.sub.particle.speed;
    let k = 0;
    while (k < this.n) {
      this.life[k] += (speed / this.rise[k]) * dt;
      if (this.life[k] >= 1) {
        const last = --this.n;
        for (let j = 0; j < 3; j++) this.base[k * 3 + j] = this.base[last * 3 + j];
        this.life[k] = this.life[last];
        this.rise[k] = this.rise[last];
        continue;
      }
      k++;
    }
  }

  write() {
    for (let k = 0; k < this.n; k++) {
      this.pos[k * 3] = this.base[k * 3];
      this.pos[k * 3 + 1] = this.base[k * 3 + 1] + this.life[k] * this.rise[k];
      this.pos[k * 3 + 2] = this.base[k * 3 + 2];
      this.alpha[k] = 1 - this.life[k];
    }
    const g = this.points.geometry;
    g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = true;
    g.attributes.alpha.needsUpdate = true;
  }
}
