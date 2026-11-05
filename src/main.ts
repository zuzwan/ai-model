import * as THREE from 'three';
import style from './scene/style.json';
import { createRig } from './scene/camera';
import { buildChambers } from './scene/chambers';
import { buildFields } from './scene/fields';
import { buildEnvelopes } from './scene/envelopes';
import { buildMembranes } from './scene/membranes';
import { buildConduits } from './scene/conduits';
import type { Part } from './scene/part';
import { createInspector } from './ui/inspect';
import { bindKeys } from './ui/keys';

const stage = document.getElementById('stage')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(style.ground, 1);
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const rig = createRig(renderer.domElement);

const parts: Part[] = [
  ...buildEnvelopes(),
  ...buildChambers(),
  ...buildMembranes(),
  ...buildConduits(),
  ...buildFields(),
];
for (const p of parts) scene.add(p.object);

const inspector = createInspector(renderer.domElement, rig.camera);
inspector.setPickables(parts.flatMap((p) => p.pickables));

// Envelope modes: both, loop only, model only. The non-selected envelope goes to wireframe.
const modes = ['both', 'loop', 'model'] as const;
let mode = 0;
const wire = { loop: { cur: 0, target: 0 }, model: { cur: 0, target: 0 } };
const wireGroup = (p: Part): 'loop' | 'model' | null =>
  p.level === 'envelope' ? p.envelopeOf! : p.level === 'env' ? null : p.level;

bindKeys((intent) => {
  if (intent.type === 'camera') rig.goTo(intent.preset);
  if (intent.type === 'cycleEnvelopes') {
    mode = (mode + 1) % modes.length;
    wire.loop.target = modes[mode] === 'model' ? 1 : 0;
    wire.model.target = modes[mode] === 'loop' ? 1 : 0;
  }
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  rig.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = now - last;
  last = now;
  for (const g of [wire.loop, wire.model]) {
    const step = dt / style.fadeMs;
    const before = g.cur;
    g.cur = g.cur < g.target ? Math.min(g.target, g.cur + step) : Math.max(g.target, g.cur - step);
    (g as { changed?: boolean }).changed = g.cur !== before;
  }
  for (const p of parts) {
    const g = wireGroup(p);
    if (g && (wire[g] as { changed?: boolean }).changed) p.setWire(wire[g].cur);
  }
  rig.update(now);
  renderer.render(scene, rig.camera);
});

// Exposed for headless checks.
(window as unknown as { __organism: object }).__organism = { parts: parts.map((p) => p.id), rig, scene };
