// Picking, hover readout and direct manipulation (apertures, stocks, valves, the objective triangle).
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import style from '../scene/style.json';
import ui from './ui.json';
import type { Branch } from '../app/branch';
import { componentById, flowById, surfaceById, ontology } from '../sim/ontology';
import { core, usefulness, meanDependence, type State } from '../sim/state';
import { aperture, valve } from '../sim/params';
import { nameOf, blurbOf } from './context';

export interface Hit { branch: Branch; index: number; id: string; point: THREE.Vector3; object: THREE.Object3D }

export interface Perturb {
  setAperture(b: Branch, surface: string, i: number, v: number): void;
  setStock(b: Branch, component: string, frac: number): void;
  setValve(b: Branch, flow: string, gain: number): void;
  setWeights(b: Branch, w: [number, number, number]): void;
  select(b: Branch | null, id: string | null): void;
}

const STOCKS = new Set(['L1', 'L3', 'L5', 'L9']);

export class Interaction {
  private ray = new THREE.Raycaster();
  private readout: HTMLDivElement;
  private drag: { hit: Hit; y0: number; g0: number } | null = null;
  private plane = new THREE.Plane();

  constructor(
    private dom: HTMLElement,
    private camera: THREE.PerspectiveCamera,
    private controls: OrbitControls,
    private branches: () => Branch[],
    private viewT: () => number,
    private act: Perturb,
  ) {
    this.readout = document.createElement('div');
    this.readout.className = 'readout';
    this.readout.style.fontSize = `${style.readout.fontPx}px`;
    document.body.appendChild(this.readout);
    dom.addEventListener('pointerdown', (ev) => this.down(ev), { capture: true });
    window.addEventListener('pointermove', (ev) => this.move(ev));
    window.addEventListener('pointerup', () => this.up());
    dom.addEventListener('pointerleave', () => { if (!this.drag) this.hide(); });
  }

  /** Which branch's viewport is under the pointer, and the pointer in that viewport's NDC. */
  private locate(ev: PointerEvent): { index: number; ndc: THREE.Vector2 } {
    const r = this.dom.getBoundingClientRect();
    const n = this.branches().length;
    const w = r.width / n;
    const index = Math.min(n - 1, Math.max(0, Math.floor((ev.clientX - r.left) / w)));
    const x = (ev.clientX - r.left - index * w) / w;
    const y = (ev.clientY - r.top) / r.height;
    return { index, ndc: new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)) };
  }

  hit(ev: PointerEvent): Hit | null {
    const { index, ndc } = this.locate(ev);
    const branch = this.branches()[index];
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObjects(branch.view.pickables(), false).filter((h) => h.object.userData.id);
    if (!hits.length) return null;
    const pri = (o: THREE.Object3D) => (style.pick.priority as Record<string, number>)[o.userData.pick ?? 'default'] ?? 1;
    const best = hits
      .filter((h) => h.distance - hits[0].distance <= style.pick.window)
      .reduce((b, h) => (pri(h.object) > pri(b.object) ? h : b));
    return { branch, index, id: best.object.userData.id as string, point: best.point, object: best.object };
  }

  private draggable(id: string): boolean {
    if (id === 'L6.objective' || STOCKS.has(id)) return true;
    if (flowById.get(id)?.valveable) return true;
    return surfaceById.get(id)?.layout.membrane === true;
  }

  private down(ev: PointerEvent) {
    if (ev.button !== 0) return;
    const h = this.hit(ev);
    if (!h || !this.draggable(h.id)) { this.act.select(null, null); return; }
    this.controls.enabled = false;
    const g0 = flowById.has(h.id) ? valve(h.branch.params, h.id) : 0;
    this.drag = { hit: h, y0: ev.clientY, g0 };
    this.act.select(h.branch, h.id);
    this.apply(ev);
    this.hide();
  }

  private up() {
    if (this.drag) { this.drag = null; this.controls.enabled = true; }
  }

  private move(ev: PointerEvent) {
    if (this.drag) { this.apply(ev); return; }
    if (ev.target !== this.dom || ev.buttons) { this.hide(); return; }
    const h = this.hit(ev);
    if (!h) { this.hide(); return; }
    const vals = describe(h.branch, h.id, h.branch.stateAt(this.viewT())).split('\n').slice(1).join('\n');
    this.readout.replaceChildren();
    const title = document.createElement('div'); title.className = 'ro-title'; title.textContent = nameOf(h.id);
    const idEl = document.createElement('span'); idEl.className = 'ro-id'; idEl.textContent = h.id; title.prepend(idEl);
    const blurb = document.createElement('div'); blurb.className = 'ro-blurb'; blurb.textContent = blurbOf(h.id);
    const pre = document.createElement('div'); pre.className = 'ro-vals'; pre.textContent = vals;
    this.readout.append(title, ...(blurb.textContent ? [blurb] : []), ...(vals ? [pre] : []));
    this.onHover?.(h.id);
    this.readout.style.left = `${ev.clientX + style.readout.offsetPx}px`;
    this.readout.style.top = `${ev.clientY + style.readout.offsetPx}px`;
    this.readout.style.opacity = '1';
  }

  private hide() { this.readout.style.opacity = '0'; this.onHover?.(null); }

  /** Told which id the pointer is over, or null. */
  onHover?: (id: string | null) => void;

  /** Intersect the pointer ray with a plane; null when parallel. */
  private onPlane(ev: PointerEvent, plane: THREE.Plane): THREE.Vector3 | null {
    const { ndc } = this.locate(ev);
    this.ray.setFromCamera(ndc, this.camera);
    return this.ray.ray.intersectPlane(plane, new THREE.Vector3());
  }

  private apply(ev: PointerEvent) {
    const { hit } = this.drag!;
    const b = hit.branch;
    const id = hit.id;
    if (id === 'L6.objective') {
      const { center } = b.view.triPlane;
      this.plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), center);
      const p = this.onPlane(ev, this.plane);
      if (p) this.act.setWeights(b, b.view.weightsAt(p));
      return;
    }
    if (STOCKS.has(id)) {
      const l = componentById.get(id)!.layout;
      const c = new THREE.Vector3(l.x, l.y, l.z);
      const n = new THREE.Vector3().subVectors(this.camera.position, c).setY(0).normalize();
      this.plane.setFromNormalAndCoplanarPoint(n, c);
      const p = this.onPlane(ev, this.plane);
      if (p) this.act.setStock(b, id, Math.min(1, Math.max(0, (p.y - (l.y - l.h / 2)) / l.h)));
      return;
    }
    if (flowById.has(id)) {
      const g = Math.min(2, Math.max(0, this.drag!.g0 + (this.drag!.y0 - ev.clientY) / ui.valvePxPerUnit));
      this.act.setValve(b, id, Math.round(g * 100) / 100);
      return;
    }
    const s = surfaceById.get(id);
    if (s) {
      const m = b.view.membranes.get(id)!;
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(m.object.quaternion);
      this.plane.setFromNormalAndCoplanarPoint(normal, m.object.position);
      const p = this.onPlane(ev, this.plane);
      if (!p) return;
      const local = m.object.worldToLocal(p.clone());
      const rows = Math.max(1, s.apertures.length);
      const i = rows > 1 ? Math.min(rows - 1, Math.max(0, Math.floor((s.layout.h / 2 - local.y) / (s.layout.h / rows)))) : 0;
      const v = Math.min(1, Math.max(0, Math.abs(local.x) / (s.layout.w / 2)));
      this.act.setAperture(b, id, i, Math.round(v * 100) / 100);
    }
  }
}

const fmt = (v: unknown): string =>
  typeof v === 'number' ? (Number.isInteger(v) ? String(v) : Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(3))
  : typeof v === 'boolean' ? (v ? 'true' : 'false')
  : Array.isArray(v) ? String(v.length)
  : v === null ? '–' : String(v);

function flatten(obj: object, prefix = ''): [string, unknown][] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flatten(v as object, `${prefix}${k}.`) : [[`${prefix}${k}`, v] as [string, unknown]]);
}

/** The hover readout: the ID, then variable names and current values. Nothing else. */
export function describe(b: Branch, id: string, s: State): string {
  const lines: string[] = [id];
  const add = (k: string, v: unknown) => lines.push(`${k}  ${fmt(v)}`);
  if (id === 'L6.objective') {
    add('w_usage', s.L6.w_usage); add('w_usefulness', s.L6.w_usefulness); add('w_safety', s.L6.w_safety);
  } else if (id === 'hidden') {
    const c = core(s);
    add('V', usefulness(s)); add('G', c.G); add('D', meanDependence(s));
  } else if (componentById.has(id)) {
    const comp = (s as unknown as Record<string, object>)[id];
    for (const [k, v] of flatten(comp)) if (k !== 'pipeline' && k !== 'candidate') add(k, v);
  } else if (flowById.has(id)) {
    add('rate', s.flows[id] ?? 0);
    if (flowById.get(id)!.valveable) add('gain', valve(b.params, id));
  } else if (surfaceById.has(id)) {
    const sf = surfaceById.get(id)!;
    sf.apertures.forEach((a, i) => add(sf.apertures.length > 1 ? `aperture.${a}` : 'aperture', aperture(b.params, id, i)));
    for (const f of [...sf.inbound, ...sf.outbound]) add(f, s.flows[f] ?? 0);
  }
  return lines.join('\n');
}

export const umweltHidden = ontology.umwelt.hiddenTraces;
