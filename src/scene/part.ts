import * as THREE from 'three';
import type { Level } from '../sim/ontology';
import style from './style.json';

/** One rendered element that can be hovered and faded to wireframe. */
export interface Part {
  id: string;
  level: Level | 'envelope';
  envelopeOf?: 'loop' | 'model';
  object: THREE.Object3D;
  pickables: THREE.Object3D[];
  setWire(w: number): void;
}

export const ink = new THREE.Color(style.ink);
export const wireInk = new THREE.Color(style.edgeWire);

export function faceMaterial(opacity: number, color = style.faceColor): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  });
}

export function edgeMaterial(color: THREE.ColorRepresentation = style.ink): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color });
}

/** Invisible but raycastable material for pick proxies. */
export const pickMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

/** Record each material's base opacity so wire fades can scale it. */
export function fader(faces: THREE.Material[], edges: THREE.LineBasicMaterial[], edgeBase = ink) {
  const base = faces.map((m) => m.opacity);
  return (w: number) => {
    faces.forEach((m, i) => { m.opacity = base[i] * (1 - w); m.visible = m.opacity > 0.001; });
    edges.forEach((m) => m.color.copy(edgeBase).lerp(wireInk, w));
  };
}
