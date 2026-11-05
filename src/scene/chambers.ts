// Chamber meshes: translucent faces, black edges, and a fill plane at the stock level.
import * as THREE from 'three';
import { ontology, type Component } from '../sim/ontology';
import style from './style.json';
import { type Part, faceMaterial, edgeMaterial, fader, pickMaterial } from './part';

export interface Chamber extends Part {
  /** Fill levels 0..1, one per channel. */
  setFill(levels: number[]): void;
  /** Throughput pulse: a scale oscillation, `amount` of the chamber size, and a tilt of the fill plane in radians. */
  setPulse(amount: number, tilt?: number): void;
}

function cylinderEdges(r: number, h: number): THREE.BufferGeometry {
  const pts: number[] = [];
  const seg = 48;
  for (const y of [-h / 2, h / 2]) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
}

function buildChamber(c: Component): Chamber {
  const l = c.layout;
  const group = new THREE.Group();
  group.position.set(l.x, l.y, l.z);
  const faces: THREE.Material[] = [];
  const edges: THREE.LineBasicMaterial[] = [];
  const pickables: THREE.Object3D[] = [];
  const fills: { plane: THREE.Mesh; volume: THREE.Mesh; h: number }[] = [];

  const faceOpacity = l.shape === 'slab' ? style.slabOpacity : style.faceOpacity;
  const fm = faceMaterial(faceOpacity);
  const em = edgeMaterial();
  faces.push(fm);
  edges.push(em);

  let body: THREE.BufferGeometry;
  let edgeGeom: THREE.BufferGeometry;
  if (l.shape === 'cylinder') {
    const r = Math.min(l.w, l.d) / 2;
    body = new THREE.CylinderGeometry(r, r, l.h, 48, 1, true);
    edgeGeom = cylinderEdges(r, l.h);
  } else if (l.shape === 'tube') {
    const r = l.h / 2;
    body = new THREE.CylinderGeometry(r, r, l.w, 32, 1, true).rotateZ(Math.PI / 2);
    edgeGeom = cylinderEdges(r, l.w).rotateZ(Math.PI / 2);
  } else if (l.shape === 'ring') {
    const r = l.h / 2;
    body = new THREE.TorusGeometry(r, l.w / 4, 8, 48).rotateY(Math.PI / 2);
    edgeGeom = cylinderEdges(r, 0).rotateZ(Math.PI / 2);
    fm.opacity = 0.5;
  } else if (l.shape === 'tray') {
    const g = new THREE.BoxGeometry(l.w, l.h, l.d);
    body = g;
    edgeGeom = new THREE.EdgesGeometry(g);
  } else {
    const g = new THREE.BoxGeometry(l.w, l.h, l.d);
    body = g;
    edgeGeom = new THREE.EdgesGeometry(g);
  }
  const bodyMesh = new THREE.Mesh(body, fm);
  bodyMesh.renderOrder = 2;
  group.add(bodyMesh, new THREE.LineSegments(edgeGeom, em));

  // Pick proxy matches the bounding box so thin shapes are still hoverable.
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.d), pickMaterial);
  proxy.userData.id = c.id;
  proxy.userData.pick = l.shape;
  group.add(proxy);
  pickables.push(proxy);

  // Fill planes for stock chambers (not the tube or ring).
  const fillable = l.shape === 'box' || l.shape === 'cylinder' || l.shape === 'slab' || l.shape === 'tray';
  if (fillable) {
    const channels = l.channels ?? 1;
    const inset = 0.94;
    for (let i = 0; i < channels; i++) {
      const d = l.d / channels;
      const z = -l.d / 2 + d * (i + 0.5);
      const pm = faceMaterial(style.fillPlaneOpacity, style.fillPlaneColor);
      const vm = faceMaterial(style.fillVolumeOpacity, style.fillVolumeColor);
      faces.push(pm, vm);
      let planeGeom: THREE.BufferGeometry;
      let volGeom: THREE.BufferGeometry;
      if (l.shape === 'cylinder') {
        const r = (Math.min(l.w, l.d) / 2) * inset;
        planeGeom = new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2);
        volGeom = new THREE.CylinderGeometry(r, r, 1, 48, 1, false).translate(0, 0.5, 0);
      } else {
        planeGeom = new THREE.PlaneGeometry(l.w * inset, d * inset).rotateX(-Math.PI / 2);
        volGeom = new THREE.BoxGeometry(l.w * inset, 1, d * inset).translate(0, 0.5, 0);
      }
      const plane = new THREE.Mesh(planeGeom, pm);
      const volume = new THREE.Mesh(volGeom, vm);
      plane.position.z = l.shape === 'cylinder' ? 0 : z;
      volume.position.set(0, -l.h / 2, plane.position.z);
      plane.renderOrder = 3;
      group.add(plane, volume);
      fills.push({ plane, volume, h: l.h });
      if (channels > 1 && i > 0) {
        const divider = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-l.w / 2, -l.h / 2, -l.d / 2 + d * i), new THREE.Vector3(l.w / 2, -l.h / 2, -l.d / 2 + d * i),
          new THREE.Vector3(l.w / 2, l.h / 2, -l.d / 2 + d * i), new THREE.Vector3(-l.w / 2, l.h / 2, -l.d / 2 + d * i),
        ]);
        divider.setIndex([0, 1, 1, 2, 2, 3, 3, 0]);
        const dm = edgeMaterial();
        edges.push(dm);
        group.add(new THREE.LineSegments(divider, dm));
      }
    }
  }

  const setFill = (levels: number[]) => {
    fills.forEach((f, i) => {
      const v = Math.min(1, Math.max(0, levels[i] ?? levels[0] ?? 0));
      const y = -f.h / 2 + f.h * v;
      f.plane.position.y = y;
      f.plane.visible = v > 0.001;
      f.volume.scale.y = Math.max(1e-4, f.h * v);
      f.volume.visible = v > 0.001;
    });
  };
  const setPulse = (amount: number, tilt = 0) => {
    group.scale.setScalar(1 + amount);
    for (const f of fills) f.plane.rotation.z = tilt;
  };
  const rest = l.rest ?? 0;
  const restLevels = (l.channels ?? 1) > 1 ? Array.from({ length: l.channels! }, (_, i) => rest * (1.1 - 0.2 * i)) : [rest];
  setFill(restLevels);

  return { id: c.id, level: c.level, object: group, pickables, ...fader(faces, edges, undefined, [fm]), setFill, setPulse };
}

export function buildChambers(): Chamber[] {
  return ontology.components.filter((c) => c.level !== 'env').map(buildChamber);
}
