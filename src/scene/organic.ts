// Organic forms: soft pods, capsules and a fresnel shell material. Greyscale only.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import style from './style.json';

const o = style.organic;

/**
 * Translucent shell whose opacity rises toward the silhouette (fresnel), so a form
 * reads as a rounded volume rather than a box of flat faces. Opacity and color stay
 * ordinary material properties, so the fader can still modulate them.
 */
export function shellMaterial(opacity: number, color: THREE.ColorRepresentation = style.faceColor, rim = o.rimGain): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uFresPow = { value: o.fresnelPower };
    shader.uniforms.uCore = { value: o.coreGain };
    shader.uniforms.uRim = { value: rim };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFresN;\nvarying vec3 vFresV;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFresN = normalize(normalMatrix * normal);\nvFresV = -mvPosition.xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFresN;\nvarying vec3 vFresV;\nuniform float uFresPow;\nuniform float uCore;\nuniform float uRim;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat fres = pow(1.0 - abs(dot(normalize(vFresN), normalize(vFresV))), uFresPow);\ndiffuseColor.a = min(1.0, diffuseColor.a * mix(uCore, uRim, fres));');
  };
  m.customProgramCacheKey = () => 'organic-shell';
  return m;
}

/** Corner radius for a pod of the given size: `k` of the smallest dimension, capped below half. */
export function podRadius(w: number, h: number, d: number, k: number): number {
  return Math.min(w, h, d) * Math.min(0.49, k);
}

export function pod(w: number, h: number, d: number, k: number): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, o.podSegments, podRadius(w, h, d, k));
}

/** Rounded-rectangle outline in the xz plane at height y, as line-segment pairs. */
export function roundedLoop(w: number, d: number, r: number, y: number, seg = 10): number[] {
  const pts: THREE.Vector3[] = [];
  const hw = w / 2 - r;
  const hd = d / 2 - r;
  const corners: [number, number, number][] = [[hw, hd, 0], [-hw, hd, Math.PI / 2], [-hw, -hd, Math.PI], [hw, -hd, Math.PI * 1.5]];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
    }
  }
  const out: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  return out;
}

/** Contour lines for a pod: two horizontal rings where the flanks meet the domes. */
export function podContours(w: number, h: number, d: number, k: number): THREE.BufferGeometry {
  const r = podRadius(w, h, d, k);
  const y = h / 2 - r;
  const pts = [...roundedLoop(w, d, r, y), ...roundedLoop(w, d, r, -y)];
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
}

export function roundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2;
  const hd = d / 2;
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}

/** Capsule along y: a cylinder of radius r and total height h with hemispherical ends. */
export function capsule(r: number, h: number): THREE.BufferGeometry {
  const rr = Math.min(r, h / 2);
  return new THREE.CapsuleGeometry(rr, Math.max(1e-4, h - rr * 2), o.capSegments, 48);
}

/** Two rings where a capsule's flanks meet its domes. */
export function capsuleContours(r: number, h: number): THREE.BufferGeometry {
  const rr = Math.min(r, h / 2);
  const pts: number[] = [];
  const seg = 48;
  for (const y of [-(h / 2 - rr), h / 2 - rr]) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
}

/**
 * How far the cross-section of a rounded form is pulled in at height y (measured from
 * the centre), for a form of half-height hh and corner radius r.
 */
export function shrinkAt(y: number, hh: number, r: number): number {
  const dy = Math.abs(y) - (hh - r);
  if (dy <= 0) return 0;
  return r - Math.sqrt(Math.max(0, r * r - dy * dy));
}
