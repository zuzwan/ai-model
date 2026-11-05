// The living schematic: builds every part and binds simulation state to fills, pulses,
// apertures, particles, heat, traces and events. Reads State; never mutates it.
import * as THREE from 'three';
import { ontology, componentById, substanceById } from '../sim/ontology';
import type { State } from '../sim/state';
import style from './style.json';
import { buildChambers, type Chamber } from './chambers';
import { buildFields } from './fields';
import { buildEnvelopes } from './envelopes';
import { buildMembranes, type Membrane } from './membranes';
import { buildConduits } from './conduits';
import { FlowParticles, HeatParticles, makeTrack } from './particles';
import { Traces, HiddenPanel } from './traces';
import { type Part, pickMaterial } from './part';
import { buildFlowPaths } from './layout';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type FillVar = keyof typeof style.fills;

function fillValue(s: State, id: FillVar): number[] {
  const f = style.fills[id];
  const sc = (v: number) => clamp01(v / f.scale);
  switch (id) {
    case 'L1': return [sc(s.L1.corpus_human)];
    case 'L2': return [sc(s.L2.train_progress)];
    case 'L3': return [sc(s.L3.capacity)];
    case 'L4': return [sc(s.L4.consumer.request_rate), sc(s.L4.enterprise.request_rate)];
    case 'L5': return [sc(s.L5.reserve)];
    case 'L6': return [sc(s.L6.benchmark_score)];
    case 'L7': return [sc(Object.values(s.L7.allocation_vector).reduce((a, b) => a + b, 0))];
    case 'L8': return [sc(s.L8.filter_strength)];
    case 'L9': return [sc(s.L9.legitimacy)];
    case 'L10': return [sc(s.L10.generations.length)];
    case 'L11': return [sc(s.L11.know_how)];
    case 'M1': return [sc(s.M1.capability)];
    case 'M3': return [sc(s.M3.occupancy)];
  }
}

/** Which flow drives each chamber's pulse. */
const PULSE: Record<string, string[]> = { L2: ['F5'], L4: ['F8'], L6: ['F21', 'F22'], L7: ['F23', 'F25'], M2: ['F12'] };

const UNREGISTERED = new Set(ontology.umwelt.unregistered);

const MODEL_FLOWS = new Set(
  ontology.flows.filter((f) => componentById.get(f.from)?.level === 'model' || componentById.get(f.to)?.level === 'model').map((f) => f.id),
);

export class OrganismView {
  readonly group = new THREE.Group();
  readonly parts: Part[];
  readonly chambers = new Map<string, Chamber>();
  readonly membranes = new Map<string, Membrane>();
  readonly traces = new Traces();
  private systems = new Map<string, FlowParticles>();
  private trackOf = new Map<string, { sys: FlowParticles; i: number; density: number; signal: boolean }>();
  private heat: HeatParticles;
  private archive: THREE.LineSegments;
  private archiveMat: THREE.LineBasicMaterial;
  private archiveCount = -1;
  private lineageEnd: number | null = -1;
  private phase = new Map<string, number>();
  private flash = 0;
  private dep = 0;
  private depTarget = 0;
  private cur?: State;
  private lastT = -1;
  private umwelt = 0;
  private umweltTarget = 0;
  readonly hidden = new HiddenPanel(pickMaterial);
  private rings = new Map<string, { group: THREE.Group; arc: THREE.Mesh; gain: number }>();
  private paths = buildFlowPaths();
  private triangle: THREE.Group;
  private triMarker: THREE.Mesh;
  private triLines: THREE.LineBasicMaterial;
  readonly triPlane: { center: THREE.Vector3; verts: THREE.Vector3[] };
  private selected: string | null = null;
  /** Viewer aperture settings per surface (0..1 per aperture), multiplied into the driven width. */
  viewerApertures: Record<string, number[]> = {};

  constructor(readonly refs: Record<string, number>) {
    const envelopes = buildEnvelopes();
    const chambers = buildChambers();
    const membranes = buildMembranes();
    const conduits = buildConduits();
    const fields = buildFields();
    this.parts = [...envelopes, ...chambers, ...membranes, ...conduits, ...fields];
    for (const p of this.parts) this.group.add(p.object);
    for (const c of chambers) this.chambers.set(c.id, c);
    for (const m of membranes) this.membranes.set(m.id, m);
    this.group.add(this.traces.group);

    // Particle systems, one per substance, with one track per rendered flow.
    for (const sub of ontology.substances) {
      if (sub.id === 'heat') continue;
      const sys = new FlowParticles(sub);
      this.systems.set(sub.id, sys);
      this.group.add(sys.points);
    }
    for (const c of conduits) {
      const f = ontology.flows.find((x) => x.id === c.id)!;
      const sys = this.systems.get(f.substance)!;
      const i = sys.addTrack(makeTrack(f.id, c.path.curve, MODEL_FLOWS.has(f.id)));
      this.trackOf.set(f.id, { sys, i, density: substanceById.get(f.substance)!.particle.density, signal: f.substance === 'signals' });
    }
    const src = (id: string) => {
      const l = componentById.get(id)!.layout;
      return { center: new THREE.Vector3(l.x, l.y, l.z), w: l.w, d: l.d, h: Math.max(l.h, 0.25) };
    };
    this.heat = new HeatParticles([src('L3'), src('M2')], substanceById.get('heat')!);
    this.group.add(this.heat.points);

    // Archive tick marks: one per generation on the front face of L10.
    this.archiveMat = new THREE.LineBasicMaterial({ color: style.archive.color });
    this.archive = new THREE.LineSegments(new THREE.BufferGeometry(), this.archiveMat);
    this.group.add(this.archive);
    this.group.add(this.hidden.group);

    // The objective triangle on L6's outer face, read from the back view (8):
    // w_usage lower left, w_usefulness lower right, w_safety top.
    const L6 = componentById.get('L6')!.layout;
    const T = style.triangle;
    const center = new THREE.Vector3(L6.x, L6.y, L6.z - L6.d / 2 - 0.003);
    const verts = [210, 330, 90].map((deg) => {
      const a = (deg * Math.PI) / 180;
      // Seen from behind, screen right is -x.
      return new THREE.Vector3(center.x - T.radius * Math.cos(a), center.y + T.radius * Math.sin(a), center.z);
    });
    this.triPlane = { center, verts };
    this.triangle = new THREE.Group();
    this.triLines = new THREE.LineBasicMaterial({ color: T.lineColor });
    const tg = new THREE.BufferGeometry().setFromPoints([verts[0], verts[1], verts[2], verts[0]]);
    this.triangle.add(new THREE.Line(tg, this.triLines));
    this.triMarker = new THREE.Mesh(new THREE.CircleGeometry(T.marker, 20), new THREE.MeshBasicMaterial({ color: T.color, side: THREE.DoubleSide }));
    this.triangle.add(this.triMarker);
    const triProxy = new THREE.Mesh(new THREE.CircleGeometry(T.radius * 1.15, 3, Math.PI / 2), pickMaterial);
    triProxy.position.copy(center);
    triProxy.userData.id = 'L6.objective';
    triProxy.userData.pick = 'ring';
    this.triangle.add(triProxy);
    this.triProxy = triProxy;
    this.group.add(this.triangle);
  }

  readonly triProxy: THREE.Mesh;

  /** Pickables including the interactive overlays. */
  pickables(): THREE.Object3D[] {
    const out = this.parts.flatMap((p) => p.pickables);
    out.push(this.triProxy);
    if (this.hidden.group.visible) out.push(this.hidden.proxy);
    return out;
  }

  /** Barycentric weights (u, v, s) for a point on the triangle's plane, clamped to the simplex. */
  weightsAt(p: THREE.Vector3): [number, number, number] {
    const [a, b, c] = this.triPlane.verts;
    const v0 = b.clone().sub(a), v1 = c.clone().sub(a), v2 = p.clone().sub(a);
    const d00 = v0.dot(v0), d01 = v0.dot(v1), d11 = v1.dot(v1), d20 = v2.dot(v0), d21 = v2.dot(v1);
    const den = d00 * d11 - d01 * d01;
    let wv = (d11 * d20 - d01 * d21) / den;
    let ws = (d00 * d21 - d01 * d20) / den;
    let wu = 1 - wv - ws;
    wu = Math.max(0, wu); wv = Math.max(0, wv); ws = Math.max(0, ws);
    const sum = wu + wv + ws || 1;
    return [wu / sum, wv / sum, ws / sum];
  }

  private placeMarker(s: State) {
    const [a, b, c] = this.triPlane.verts;
    const p = a.clone().multiplyScalar(s.L6.w_usage).addScaledVector(b, s.L6.w_usefulness).addScaledVector(c, s.L6.w_safety);
    this.triMarker.position.set(p.x, p.y, p.z - 0.001);
  }

  setValve(id: string, gain: number) {
    let r = this.rings.get(id);
    const R = style.valveRing;
    if (!r) {
      const path = this.paths.get(id);
      if (!path) return;
      const group = new THREE.Group();
      const mid = path.curve.getPointAt(0.5);
      const tan = path.curve.getTangentAt(0.5);
      group.position.copy(mid);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.normalize());
      const ref = new THREE.Mesh(new THREE.TorusGeometry(R.radius, R.tube * 0.5, 6, 48), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: R.refOpacity }));
      group.add(ref);
      const arc = new THREE.Mesh(new THREE.TorusGeometry(R.radius, R.tube, 6, 48, Math.PI * 2), new THREE.MeshBasicMaterial({ color: '#000' }));
      group.add(arc);
      const proxy = new THREE.Mesh(new THREE.SphereGeometry(R.radius * 1.4, 8, 8), pickMaterial);
      proxy.userData.id = id;
      proxy.userData.pick = 'ring';
      group.add(proxy);
      this.group.add(group);
      r = { group, arc, gain: -1 };
      this.rings.set(id, r);
      const conduit = this.parts.find((p) => p.id === id);
      conduit?.pickables.push(proxy);
    }
    if (r.gain === gain) return;
    r.gain = gain;
    // The ring's arc shows the gain: a full circle is 2x, half a circle is 1x (unchanged).
    r.arc.geometry.dispose();
    r.arc.geometry = new THREE.TorusGeometry(R.radius, R.tube, 6, 48, Math.max(0.001, (gain / 2) * Math.PI * 2));
    r.group.visible = gain !== 1 || this.selected === id;
  }

  setSelected(id: string | null) {
    if (this.selected === id) return;
    const prev = this.selected;
    this.selected = id;
    for (const p of this.parts) p.setAccent(p.id === id);
    this.triLines.color.set(id === 'L6.objective' ? style.accent : style.triangle.lineColor);
    for (const k of [prev, id]) {
      const r = k ? this.rings.get(k) : undefined;
      if (r) r.group.visible = r.gain !== 1 || this.selected === k;
    }
    if (id && /^F\d+$/.test(id) && !this.rings.has(id)) this.setValve(id, 1);
  }

  setUmwelt(on: boolean) { this.umweltTarget = on ? 1 : 0; this.hidden.group.visible = on; }

  /** Particle size is in world units; the shader needs the projection scale in pixels. */
  setViewport(heightPx: number, fovDeg: number) {
    const scale = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
    for (const sys of this.systems.values()) sys.material.uniforms.uScale.value = scale;
    this.heat.material.uniforms.uScale.value = scale;
  }

  /** Bind the interpolated state between prev and cur (alpha in 0..1). */
  bind(cur: State, prev: State, alpha: number) {
    const jumped = Math.abs(cur.t - prev.t) > 1 || (this.lastT >= 0 && Math.abs(cur.t - this.lastT) > 1);
    if (cur.t !== this.lastT) {
      if (cur.L7.release_flag && cur.t === this.lastT + 1) this.flash = 1;
      if (jumped) this.clearParticles();
      this.lastT = cur.t;
    }
    this.cur = cur;

    for (const [id, ch] of this.chambers) {
      if (!(id in style.fills)) continue;
      const a = fillValue(prev, id as FillVar);
      const b = fillValue(cur, id as FillVar);
      ch.setFill(b.map((v, i) => lerp(a[i] ?? v, v, alpha)));
    }

    // Apertures follow their surface's state, so a closing surface shows before its flow stops.
    const A = style.apertureScale;
    const gate = cur.L9.gate_open && !cur.L7.deprecate_flag && cur.alive ? 1 : 0;
    const ap = (s: State) => ({
      S1: (['consumer', 'enterprise'] as const).map((c) => clamp01(gate * s.L4.uptime * A.S1 * s.E1[c].demand / Math.max(1e-6, this.refs[`demand.${c}`] ?? 1))),
      S2: [clamp01(A.S2 * s.E2.accessibility * s.E2.human_expression_rate)],
      S3: [clamp01(A.S3 * (s.flows.F15 ?? 0) / Math.max(1e-6, this.refs.F15 ?? 1))],
      S4: [clamp01(A.S4 * s.E4.scrutiny)],
      S5: [clamp01(A.S5 * s.E5.availability)],
    });
    const apA = ap(prev);
    const apB = ap(cur);
    for (const [id, m] of this.membranes) {
      const key = id as keyof typeof apB;
      const va = this.viewerApertures[id] ?? [];
      apB[key].forEach((v, i) => m.setAperture(i, lerp(apA[key][i], v, alpha) * (va[i] ?? 1)));
    }

    // Model chambers have no pulse of their own: they light only when a flow passes through them.
    const norm = (f: string) => clamp01((cur.flows[f] ?? 0) / Math.max(1e-9, this.refs[f] ?? 1));
    this.chambers.get('M2')?.setGlow(style.glow.modelFlow * norm('F12'));
    this.chambers.get('M3')?.setGlow(style.glow.modelFlow * norm('F10'));
    this.chambers.get('M4')?.setGlow(style.glow.modelFlow * norm('F12') * (cur.M4.temperature / 1));

    this.depTarget = cur.L7.deprecate_flag || !cur.alive ? 1 : 0;

    this.placeMarker(cur);

    // Archive marks.
    const gens = cur.L10.generations.length;
    if (gens !== this.archiveCount || cur.L10.lineage_end !== this.lineageEnd) this.buildArchive(cur);
  }

  private buildArchive(s: State) {
    this.archiveCount = s.L10.generations.length;
    this.lineageEnd = s.L10.lineage_end;
    const l = componentById.get('L10')!.layout;
    const n = Math.min(style.archive.maxMarks, this.archiveCount);
    const pts: number[] = [];
    const x0 = l.x - l.w / 2 + 0.03;
    const step = (l.w - 0.06) / style.archive.maxMarks;
    const z = l.z + l.d / 2 + 0.002;
    const y0 = l.y - l.h / 2 + 0.03;
    for (let i = 0; i < n; i++) pts.push(x0 + i * step, y0, z, x0 + i * step, y0 + style.archive.markHeight, z);
    if (s.L10.lineage_end !== null && n > 0) {
      // Lineage end: a bar closing the last mark.
      const x = x0 + (n - 1) * step;
      pts.push(x - step * 0.5, y0 + style.archive.markHeight, z, x + step * 1.5, y0 + style.archive.markHeight, z);
    }
    this.archive.geometry.dispose();
    this.archive.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  }

  clearParticles() {
    for (const sys of this.systems.values()) sys.clear();
    this.heat.clear();
  }

  /** Fill the conduits after a jump so streams do not start empty. */
  prewarm(tps: number) {
    const step = 0.1;
    for (let t = 0; t < style.prewarmSeconds; t += step) this.frame(step, tps, true, false);
  }

  /** Advance particles, pulses and events by dt wall seconds. */
  frame(dt: number, tps: number, playing: boolean, write = true) {
    const s = this.cur;
    if (!s) return;
    // Deprecation fades the model envelope over the standard fade.
    const fade = dt * 1000 / style.deprecationFadeMs;
    this.dep = this.dep < this.depTarget ? Math.min(this.depTarget, this.dep + fade) : Math.max(this.depTarget, this.dep - fade);
    this.umwelt = this.umwelt < this.umweltTarget ? Math.min(this.umweltTarget, this.umwelt + fade) : Math.max(this.umweltTarget, this.umwelt - fade);
    const U = ontology.umwelt;
    const umDim = ((1 - U.dimTo) / style.dimAmount) * this.umwelt;
    for (const p of this.parts) {
      const model = p.level === 'model' || p.envelopeOf === 'model';
      const hiddenFromLoop = UNREGISTERED.has(p.id);
      p.setDim(Math.max(model ? this.dep : 0, hiddenFromLoop ? umDim : 0));
    }
    const traceKeep = 1 - style.dimAmount * this.dep;
    this.traces.setOpacities(traceKeep, traceKeep * (1 - (1 - U.dimTo) * this.umwelt));
    for (const [id, t] of this.trackOf) t.sys.setTrackAlpha(t.i, UNREGISTERED.has(id) ? 1 - (1 - U.dimTo) * this.umwelt : 1);
    this.heat.material.uniforms.uOpacity.value = UNREGISTERED.has('F34') ? 1 - (1 - U.dimTo) * this.umwelt : 1;
    for (const [id, t] of this.trackOf) if (MODEL_FLOWS.has(id)) t.sys.setFrozen(t.i, this.dep > 0.5);

    // Generation flash on the weights slab.
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1000 / style.glow.flashMs);
    this.chambers.get('M1')?.setGlow(this.flash);

    if (playing) {
      for (const [id, t] of this.trackOf) {
        const rate = s.flows[id] ?? 0;
        // Signals pulse once per update; other substances emit in proportion to their flow.
        const perTick = t.signal ? (rate > 0 ? t.density : 0) : t.density * rate / Math.max(1e-9, this.refs[id] ?? 1);
        t.sys.emit(t.i, perTick * tps * dt, dt);
      }
      const heatRef = this.refs.F34 ?? 1;
      const dens = substanceById.get('heat')!.particle.density;
      this.heat.emit(0, dens * ((s.flows.F5 ?? 0) + (s.flows.F6 ?? 0) * 0.5) / heatRef * tps * dt);
      this.heat.emit(1, dens * (s.flows.F6 ?? 0) * 0.5 / heatRef * tps * dt);
      for (const sys of this.systems.values()) sys.advance(dt);
      this.heat.advance(dt);

      // Pulses: a 2 percent scale oscillation at a rate proportional to throughput.
      for (const [id, flows] of Object.entries(PULSE)) {
        const thr = flows.reduce((a, f) => a + clamp01((s.flows[f] ?? 0) / Math.max(1e-9, this.refs[f] ?? 1)), 0) / flows.length;
        const hz = Math.min(style.pulse.maxHz, style.pulse.perTick * thr * tps);
        const ph = (this.phase.get(id) ?? 0) + 2 * Math.PI * hz * dt;
        this.phase.set(id, ph);
        const amp = style.pulse.amplitude * Math.min(1, thr) * (id === 'M2' ? 1 - this.dep : 1);
        const tilt = id === 'L6' ? (s.L6.w_usage - s.L6.w_usefulness) * style.pulse.tiltPerWeight : 0;
        this.chambers.get(id)?.setPulse(amp * Math.sin(ph), tilt);
      }
    }
    // L6 tilt holds when paused too.
    if (!playing) this.chambers.get('L6')?.setPulse(0, (s.L6.w_usage - s.L6.w_usefulness) * style.pulse.tiltPerWeight);
    if (write) {
      for (const sys of this.systems.values()) sys.write();
      this.heat.write();
    }
  }

  particleCount(): number {
    let n = 0;
    for (const sys of this.systems.values()) n += sys.count;
    return n;
  }
}

/** Mean of each flow over a short headless baseline run: the reference density for particles. */
export function flowRefs(states: State[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of ontology.flows) {
    const xs = states.map((s) => s.flows[f.id] ?? 0);
    const m = xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    out[f.id] = m > 1e-9 ? m : 1;
  }
  for (const c of ['consumer', 'enterprise'] as const) out[`demand.${c}`] = states[0].E1[c].demand;
  return out;
}
