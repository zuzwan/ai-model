// Hover readout: the ID of the component, surface or flow under the cursor, at the cursor.
import * as THREE from 'three';
import style from '../scene/style.json';

export interface Inspector { setPickables(objs: THREE.Object3D[]): void; setText(fn: (id: string) => string): void }

export function createInspector(dom: HTMLElement, camera: THREE.Camera): Inspector {
  const el = document.createElement('div');
  el.className = 'readout';
  el.style.fontSize = `${style.readout.fontPx}px`;
  document.body.appendChild(el);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pickables: THREE.Object3D[] = [];
  let text = (id: string) => id;
  let dragging = false;

  dom.addEventListener('pointerdown', () => { dragging = true; el.style.opacity = '0'; });
  window.addEventListener('pointerup', () => { dragging = false; });
  dom.addEventListener('pointerleave', () => { el.style.opacity = '0'; });
  dom.addEventListener('pointermove', (ev) => {
    if (dragging) return;
    const r = dom.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, false).filter((h) => h.object.userData.id);
    // Thin or nested elements (conduits, the inference conduit inside the weights slab) win over
    // the bulky element they sit in, provided they are close behind the first hit.
    const pri = (o: THREE.Object3D) => (style.pick.priority as Record<string, number>)[o.userData.pick ?? 'default'] ?? 1;
    const hit = hits
      .filter((h) => h.distance - hits[0].distance <= style.pick.window)
      .reduce<THREE.Intersection | undefined>((best, h) => (!best || pri(h.object) > pri(best.object) ? h : best), undefined);
    if (!hit) { el.style.opacity = '0'; return; }
    el.textContent = text(hit.object.userData.id as string);
    el.style.left = `${ev.clientX + style.readout.offsetPx}px`;
    el.style.top = `${ev.clientY + style.readout.offsetPx}px`;
    el.style.opacity = '1';
  });

  return { setPickables(o) { pickables = o; }, setText(fn) { text = fn; } };
}
