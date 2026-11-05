// Positions and dimensions for every component, surface and flow path.
// All numbers come from ontology.json (positions) and style.json (routing offsets).
import { Vector3, CatmullRomCurve3 } from 'three';
import { ontology, componentById, surfaceById, type Face, type Flow } from '../sim/ontology';
import style from './style.json';

const R = style.routing;

export function faceNormal(face: Face): Vector3 {
  const s = face[0] === '+' ? 1 : -1;
  const axis = face[1];
  return new Vector3(axis === 'x' ? s : 0, axis === 'y' ? s : 0, axis === 'z' ? s : 0);
}

/** A tangent lying in the face, used to spread parallel flows across a membrane. */
export function faceTangent(face: Face): Vector3 {
  return face[1] === 'x' ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
}

export interface Box { center: Vector3; half: Vector3 }

export function boxOf(id: string): Box {
  const c = componentById.get(id);
  if (c) {
    const l = c.layout;
    return { center: new Vector3(l.x, l.y, l.z), half: new Vector3(l.w / 2, l.h / 2, l.d / 2) };
  }
  const sink = ontology.sinks.find((s) => s.id === id);
  if (!sink) throw new Error(`unknown node ${id}`);
  return { center: new Vector3(sink.layout.x, sink.layout.y, sink.layout.z), half: new Vector3() };
}

/** Point on a node's bounding surface in the direction of `toward`, with its outward normal. */
export function anchor(id: string, toward: Vector3): { p: Vector3; n: Vector3 } {
  const c = componentById.get(id);
  const { center, half } = boxOf(id);
  if (!c) return { p: center.clone(), n: toward.clone().sub(center).normalize() };
  if (c.layout.shape === 'plane' && c.layout.normal) {
    // Environment fields are flat tiles; flows leave from the tile centre along its normal.
    return { p: center.clone(), n: new Vector3().fromArray(c.layout.normal) };
  }
  const dir = toward.clone().sub(center);
  let best = Infinity;
  let axis = 0;
  for (let i = 0; i < 3; i++) {
    const di = Math.abs(dir.getComponent(i));
    if (di < 1e-9) continue;
    const t = half.getComponent(i) / di;
    if (t < best) { best = t; axis = i; }
  }
  const p = center.clone().addScaledVector(dir, best);
  const n = new Vector3();
  n.setComponent(axis, Math.sign(dir.getComponent(axis)) || 1);
  return { p, n };
}

export function surfacePoint(surfaceId: string): { p: Vector3; n: Vector3; t: Vector3 } {
  const s = surfaceById.get(surfaceId)!;
  return {
    p: new Vector3(s.layout.x, s.layout.y, s.layout.z),
    n: faceNormal(s.layout.face),
    t: faceTangent(s.layout.face),
  };
}

function spread(index: number, count: number, spacing: number): number {
  return (index - (count - 1) / 2) * spacing;
}

/** Control points for one flow's conduit. */
export function flowPoints(flow: Flow, siblingIndex: number, siblingCount: number): Vector3[] {
  const fromEnv = componentById.get(flow.from)?.level === 'env';
  if (flow.surface) {
    const sp = surfacePoint(flow.surface);
    const s = surfaceById.get(flow.surface)!;
    const members = [...s.inbound, ...s.outbound];
    const k = members.indexOf(flow.id);
    const at = sp.p.clone().addScaledVector(sp.t, spread(k, members.length, R.surfaceSpacing));
    const outer = at.clone().addScaledVector(sp.n, R.surfaceOuter);
    const inner = at.clone().addScaledVector(sp.n, -R.surfaceInner);
    const envId = fromEnv ? flow.from : flow.to;
    const loopId = fromEnv ? flow.to : flow.from;
    const e = anchor(envId, outer);
    const l = anchor(loopId, inner);
    const pts = [
      e.p,
      e.p.clone().addScaledVector(e.n, R.envLead),
      outer,
      at,
      inner,
      l.p.clone().addScaledVector(l.n, R.anchorLead),
      l.p,
    ];
    return fromEnv ? pts : pts.reverse();
  }
  const a0 = boxOf(flow.from).center;
  const b0 = boxOf(flow.to).center;
  const a = anchor(flow.from, b0);
  const b = anchor(flow.to, a0);
  const along = b.p.clone().sub(a.p);
  const up = new Vector3(0, 1, 0);
  let perp = along.clone().cross(up);
  if (perp.lengthSq() < 1e-6) perp = new Vector3(1, 0, 0);
  perp.normalize();
  const mid = a.p.clone().add(b.p).multiplyScalar(0.5)
    .addScaledVector(perp, spread(siblingIndex, siblingCount, R.parallelSpacing))
    .addScaledVector(up, R.midLift);
  return [
    a.p,
    a.p.clone().addScaledVector(a.n, R.anchorLead),
    mid,
    b.p.clone().addScaledVector(b.n, R.anchorLead),
    b.p,
  ];
}

export interface FlowPath { id: string; curve: CatmullRomCurve3 }

export function buildFlowPaths(): Map<string, FlowPath> {
  const groups = new Map<string, Flow[]>();
  for (const f of ontology.flows) {
    const key = [f.from, f.to].sort().join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  const out = new Map<string, FlowPath>();
  for (const list of groups.values()) {
    list.forEach((f, i) => {
      const pts = flowPoints(f, i, list.length);
      out.set(f.id, { id: f.id, curve: new CatmullRomCurve3(pts, false, 'centripetal') });
    });
  }
  return out;
}
