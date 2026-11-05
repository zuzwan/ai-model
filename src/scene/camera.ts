// Orbit camera with damping, constrained to the upper hemisphere, with tweened preset views.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import style from './style.json';

type Preset = { pos: number[]; target: number[] };
const presets = style.camera.presets as Record<string, Preset>;

export interface Rig {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  goTo(key: string): boolean;
  update(now: number): void;
  resize(w: number, h: number): void;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function createRig(dom: HTMLElement): Rig {
  const c = style.camera;
  const camera = new THREE.PerspectiveCamera(c.fov, 1, c.near, c.far);
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = c.damping;
  controls.maxPolarAngle = Math.PI / 2;
  controls.minDistance = c.minDistance;
  controls.maxDistance = c.maxDistance;
  const d = presets.default;
  camera.position.fromArray(d.pos);
  controls.target.fromArray(d.target);
  controls.update();

  let tween: { t0: number; p0: THREE.Vector3; q0: THREE.Vector3; p1: THREE.Vector3; q1: THREE.Vector3 } | null = null;

  return {
    camera,
    controls,
    goTo(key) {
      const p = presets[key];
      if (!p) return false;
      tween = {
        t0: performance.now(),
        p0: camera.position.clone(), q0: controls.target.clone(),
        p1: new THREE.Vector3().fromArray(p.pos), q1: new THREE.Vector3().fromArray(p.target),
      };
      return true;
    },
    update(now) {
      if (tween) {
        const k = Math.min(1, (now - tween.t0) / c.tweenMs);
        const e = ease(k);
        camera.position.lerpVectors(tween.p0, tween.p1, e);
        controls.target.lerpVectors(tween.q0, tween.q1, e);
        if (k >= 1) tween = null;
      }
      controls.update();
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
  };
}
