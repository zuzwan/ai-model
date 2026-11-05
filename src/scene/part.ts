import * as THREE from 'three';
import type { Level } from '../sim/ontology';
import style from './style.json';

/** One rendered element that can be hovered, faded to wireframe, dimmed and lit. */
export interface Part {
  id: string;
  level: Level | 'envelope';
  envelopeOf?: 'loop' | 'model';
  object: THREE.Object3D;
  pickables: THREE.Object3D[];
  /** 0 solid .. 1 wireframe (envelope toggle). */
  setWire(w: number): void;
  /** 0 normal .. 1 dimmed (deprecation, Umwelt view). */
  setDim(d: number): void;
  /** 0 normal .. 1 lit (a flow passing, a generation event). */
  setGlow(g: number): void;
  /** The single selected element takes the red accent. */
  setAccent(on: boolean): void;
}

export const ink = new THREE.Color(style.ink);
export const wireInk = new THREE.Color(style.edgeWire);
const dimInk = new THREE.Color(style.dimInk);

export function faceMaterial(opacity: number, color = style.faceColor): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  });
}

export function edgeMaterial(color: THREE.ColorRepresentation = style.ink): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 });
}

/** Invisible but raycastable material for pick proxies. */
export const pickMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false, side: THREE.DoubleSide });

export interface Look { setWire(w: number): void; setDim(d: number): void; setGlow(g: number): void; setAccent(on: boolean): void }

/** Record each material's base opacity so wire, dim and glow can modulate it. */
export function fader(faces: THREE.Material[], edges: THREE.LineBasicMaterial[], edgeBase = ink, glowFaces: THREE.Material[] = faces): Look {
  const base = faces.map((m) => m.opacity);
  const glowSet = new Set(glowFaces);
  let w = 0;
  let d = 0;
  let g = 0;
  let accent = false;
  const accentInk = new THREE.Color(style.accent);
  const apply = () => {
    const keep = (1 - w) * (1 - style.dimAmount * d);
    faces.forEach((m, i) => {
      const lit = glowSet.has(m) ? g * style.glowOpacity : 0;
      m.opacity = Math.min(1, base[i] + lit) * keep;
      m.visible = m.opacity > 0.001;
    });
    const tmp = edgeBase.clone().lerp(wireInk, w);
    if (d > 0) tmp.lerp(dimInk, style.dimAmount * d);
    if (accent) tmp.copy(accentInk);
    edges.forEach((m) => m.color.copy(tmp));
    if (accent) faces.forEach((m) => { if (m instanceof THREE.MeshBasicMaterial && m.userData.tube) m.color.copy(accentInk); });
    else faces.forEach((m) => { if (m instanceof THREE.MeshBasicMaterial && m.userData.tube) m.color.copy(m.userData.tube as THREE.Color); });
  };
  return {
    setWire(v) { if (v !== w) { w = v; apply(); } },
    setDim(v) { if (v !== d) { d = v; apply(); } },
    setGlow(v) { if (v !== g) { g = v; apply(); } },
    setAccent(v) { if (v !== accent) { accent = v; apply(); } },
  };
}
