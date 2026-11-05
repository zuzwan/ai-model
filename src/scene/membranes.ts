// Coupling surfaces: a frame on the loop envelope with one slot per aperture.
import * as THREE from 'three';
import { ontology } from '../sim/ontology';
import style from './style.json';
import { faceNormal } from './layout';
import { type Part, faceMaterial, edgeMaterial, fader, pickMaterial } from './part';

export interface Membrane extends Part {
  setAperture(index: number, a: number): void;
}

export function buildMembranes(): Membrane[] {
  return ontology.surfaces.filter((s) => s.layout.membrane).map((s) => {
    const l = s.layout;
    const n = faceNormal(l.face);
    const group = new THREE.Group();
    const p = new THREE.Vector3(l.x, l.y, l.z).addScaledVector(n, style.membraneOffset);
    group.position.copy(p);
    if (l.face[1] === 'y') group.up.set(0, 0, -1);
    group.lookAt(p.clone().add(n));

    const faces: THREE.Material[] = [];
    const edges: THREE.LineBasicMaterial[] = [];
    const frameMat = edgeMaterial();
    edges.push(frameMat);
    const frame = new THREE.EdgesGeometry(new THREE.PlaneGeometry(l.w, l.h));
    group.add(new THREE.LineSegments(frame, frameMat));

    const proxy = new THREE.Mesh(new THREE.PlaneGeometry(l.w, l.h), pickMaterial);
    proxy.userData.id = s.id;
    proxy.userData.pick = 'membrane';
    group.add(proxy);

    const count = Math.max(1, s.apertures.length);
    const gap = style.apertureGap;
    const rowH = (l.h - gap * (count + 1)) / count;
    const lipW = l.w - gap * 2;
    const rows: { left: THREE.Mesh; right: THREE.Mesh }[] = [];
    for (let i = 0; i < count; i++) {
      const y = l.h / 2 - gap - rowH * (i + 0.5) - gap * i;
      const lm = faceMaterial(style.lipOpacity, style.lipColor);
      const em = edgeMaterial();
      faces.push(lm);
      edges.push(em);
      const make = () => {
        const g = new THREE.PlaneGeometry(1, rowH);
        const m = new THREE.Mesh(g, lm);
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), em));
        m.position.y = y;
        group.add(m);
        return m;
      };
      rows.push({ left: make(), right: make() });
    }
    const setAperture = (i: number, a: number) => {
      const r = rows[i];
      if (!r) return;
      const open = Math.min(1, Math.max(0, a));
      const lip = Math.max(1e-4, (lipW * (1 - open)) / 2);
      for (const [m, sign] of [[r.left, -1], [r.right, 1]] as const) {
        m.scale.x = lip;
        m.position.x = sign * (lipW / 2 - lip / 2);
        m.visible = lip > 1e-3;
      }
    };
    for (let i = 0; i < count; i++) setAperture(i, l.rest);
    return { id: s.id, level: 'loop', object: group, pickables: [proxy], setWire: fader(faces, edges), setAperture };
  });
}
