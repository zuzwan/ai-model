// Chamber meshes: soft translucent pods with contour rings, and a fill plane at the stock level.
import * as THREE from 'three';
import { ontology, type Component } from '../sim/ontology';
import style from './style.json';
import { type Part, faceMaterial, edgeMaterial, fader, pickMaterial } from './part';
import { shellMaterial, pod, podRadius, podContours, capsule, capsuleContours, roundedRectShape, shrinkAt } from './organic';

export interface Chamber extends Part {
  /** Fill levels 0..1, one per channel. */
  setFill(levels: number[]): void;
  /** Throughput pulse: a scale oscillation, `amount` of the chamber size, and a tilt of the fill plane in radians. */
  setPulse(amount: number, tilt?: number): void;
}

function buildChamber(c: Component): Chamber {
  const l = c.layout;
  const group = new THREE.Group();
  group.position.set(l.x, l.y, l.z);
  const faces: THREE.Material[] = [];
  const edges: THREE.LineBasicMaterial[] = [];
  const pickables: THREE.Object3D[] = [];
  const fills: { plane: THREE.Mesh; volume: THREE.Mesh; h: number; w: number; r: number }[] = [];

  const faceOpacity = l.shape === 'slab' ? style.slabOpacity : style.faceOpacity;
  const fm = shellMaterial(faceOpacity);
  const em = edgeMaterial();
  faces.push(fm);
  edges.push(em);

  const og = style.organic;
  // Corner radius of the pod (0 for round shapes, whose cross-section is a circle).
  const k = l.shape === 'slab' ? og.slabK : l.shape === 'tray' ? og.trayK : og.podK;
  let r = 0;
  let body: THREE.BufferGeometry;
  let edgeGeom: THREE.BufferGeometry;
  if (l.shape === 'cylinder') {
    const rad = Math.min(l.w, l.d) / 2;
    body = capsule(rad, l.h);
    edgeGeom = capsuleContours(rad, l.h);
    r = rad;
  } else if (l.shape === 'tube') {
    const rad = l.h / 2;
    body = capsule(rad, l.w).rotateZ(Math.PI / 2);
    edgeGeom = capsuleContours(rad, l.w).rotateZ(Math.PI / 2);
  } else if (l.shape === 'ring') {
    const rad = l.h / 2;
    body = new THREE.TorusGeometry(rad, l.w / 4, 16, 64).rotateY(Math.PI / 2);
    edgeGeom = new THREE.BufferGeometry();
    fm.opacity = 0.5;
  } else {
    body = pod(l.w, l.h, l.d, k);
    edgeGeom = podContours(l.w, l.h, l.d, k);
    r = podRadius(l.w, l.h, l.d, k);
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

  // Fill planes for stock chambers (not the tube or ring). Each follows the pod's
  // cross-section, so it narrows as it rises into the dome.
  const fillable = l.shape === 'box' || l.shape === 'cylinder' || l.shape === 'slab' || l.shape === 'tray';
  if (fillable) {
    const channels = l.channels ?? 1;
    const inset = og.fillInset;
    for (let i = 0; i < channels; i++) {
      const d = l.d / channels;
      const z = -l.d / 2 + d * (i + 0.5);
      const pm = faceMaterial(style.fillPlaneOpacity, style.fillPlaneColor);
      const vm = faceMaterial(style.fillVolumeOpacity, style.fillVolumeColor);
      faces.push(pm, vm);
      let shape: THREE.Shape;
      if (l.shape === 'cylinder') {
        shape = new THREE.Shape().absarc(0, 0, (Math.min(l.w, l.d) / 2) * inset, 0, Math.PI * 2, false);
      } else {
        const fw = l.w * inset;
        const fd = d * inset;
        shape = roundedRectShape(fw, fd, Math.min(r * inset, fw / 2, fd / 2));
      }
      const planeGeom = new THREE.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2);
      const volGeom = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 24 }).rotateX(-Math.PI / 2);
      const plane = new THREE.Mesh(planeGeom, pm);
      const volume = new THREE.Mesh(volGeom, vm);
      plane.position.z = l.shape === 'cylinder' ? 0 : z;
      volume.position.set(0, -l.h / 2, plane.position.z);
      plane.renderOrder = 3;
      group.add(plane, volume);
      fills.push({ plane, volume, h: l.h, w: l.shape === 'cylinder' ? l.w : l.w, r });
      if (channels > 1 && i > 0) {
        const zc = -l.d / 2 + d * i;
        const s = r * 0.6;
        const divider = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-l.w / 2 + s, -l.h / 2 + s, zc), new THREE.Vector3(l.w / 2 - s, -l.h / 2 + s, zc),
          new THREE.Vector3(l.w / 2 - s, l.h / 2 - s, zc), new THREE.Vector3(-l.w / 2 + s, l.h / 2 - s, zc),
        ]);
        divider.setIndex([0, 1, 1, 2, 2, 3, 3, 0]);
        const dm = edgeMaterial(style.organic.dividerInk);
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
      // Narrow the plane as it rises into (or sinks into) the rounded ends.
      const k = f.r > 0 ? Math.max(0.05, 1 - (2 * shrinkAt(y, f.h / 2, f.r)) / f.w) : 1;
      f.plane.scale.set(k, 1, k);
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
