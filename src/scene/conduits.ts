// Tube geometry per flow; signal flows are dashed lines.
import * as THREE from 'three';
import { ontology, substanceById, componentById } from '../sim/ontology';
import style from './style.json';
import { buildFlowPaths, type FlowPath } from './layout';
import { type Part, fader, pickMaterial } from './part';

export interface Conduit extends Part { path: FlowPath }

export function buildConduits(): Conduit[] {
  const paths = buildFlowPaths();
  const out: Conduit[] = [];
  for (const f of ontology.flows) {
    if (!f.renders) continue;
    const sub = substanceById.get(f.substance)!;
    if (sub.conduit.style === 'none') continue;
    const path = paths.get(f.id)!;
    const group = new THREE.Group();
    const color = new THREE.Color(sub.conduit.color);
    let look: ReturnType<typeof fader>;
    if (sub.conduit.style === 'dashed') {
      const pts = path.curve.getPoints(style.tubeSegments);
      const lm = new THREE.LineDashedMaterial({ color, dashSize: style.dashSize, gapSize: style.gapSize });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm);
      line.computeLineDistances();
      group.add(line);
      look = fader([], [lm as unknown as THREE.LineBasicMaterial], color);
    } else {
      const mm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      mm.userData.tube = color.clone();
      group.add(new THREE.Mesh(new THREE.TubeGeometry(path.curve, style.tubeSegments, style.tubeRadius, style.tubeRadial), mm));
      look = fader([mm], []);
    }
    const proxy = new THREE.Mesh(new THREE.TubeGeometry(path.curve, style.tubeSegments / 2, style.pickRadius, 4), pickMaterial);
    proxy.userData.id = f.id;
    proxy.userData.pick = 'conduit';
    group.add(proxy);
    // A flow belongs to the model envelope only when both ends are inside it.
    const level = componentById.get(f.from)?.level === 'model' && componentById.get(f.to)?.level === 'model' ? 'model' : 'loop';
    out.push({ id: f.id, level, object: group, pickables: [proxy], setWire: (w) => look.setWire(w * 0.6), setDim: look.setDim, setGlow: look.setGlow, setAccent: look.setAccent, path });
  }
  return out;
}
