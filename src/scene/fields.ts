// Environment compartments: flat fields outside the loop envelope; competitors as a diffuse cloud.
import * as THREE from 'three';
import { ontology } from '../sim/ontology';
import style from './style.json';
import { roundedRectShape } from './organic';
import { type Part, faceMaterial, edgeMaterial, fader, pickMaterial } from './part';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildFields(): Part[] {
  return ontology.components.filter((c) => c.level === 'env').map((c) => {
    const l = c.layout;
    const group = new THREE.Group();
    group.position.set(l.x, l.y, l.z);
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.d), pickMaterial);
    proxy.userData.id = c.id;
    proxy.userData.pick = l.shape;
    group.add(proxy);
    const edgeBase = new THREE.Color(style.fieldEdge);
    if (l.shape === 'cloud') {
      const rnd = mulberry32(style.cloudSeed);
      const n = style.cloudPoints;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (rnd() - 0.5) * l.w;
        pos[i * 3 + 1] = (rnd() - 0.5) * l.h;
        pos[i * 3 + 2] = (rnd() - 0.5) * l.d;
      }
      const pm = new THREE.PointsMaterial({ color: style.cloudColor, size: style.cloudPointSize, transparent: true, opacity: 1, depthWrite: false });
      group.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), pm));
      return { id: c.id, level: c.level, object: group, pickables: [proxy], ...fader([pm], []) };
    }
    // A soft rounded pad with a second, inset contour.
    const rr = Math.min(l.w, l.d) * style.organic.fieldK;
    const shape = roundedRectShape(l.w, l.d, rr);
    const fm = faceMaterial(style.fieldOpacity);
    const em = edgeMaterial(style.fieldEdge);
    const pad = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16).rotateX(-Math.PI / 2), fm);
    const outline = (k: number) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
      roundedRectShape(l.w * k, l.d * k, rr * k).getPoints(12).map((p) => new THREE.Vector3(p.x, 0, -p.y))), em);
    group.add(pad, outline(1), outline(style.organic.fieldInner));
    return { id: c.id, level: c.level, object: group, pickables: [proxy], ...fader([fm], [em], edgeBase) };
  });
}
