// Wires the simulation loop, the record, the scene and the interface.
import * as THREE from 'three';
import style from './scene/style.json';
import ui from './ui/ui.json';
import { createRig } from './scene/camera';
import { OrganismView, flowRefs } from './scene/organism';
import { createInspector } from './ui/inspect';
import { bindKeys } from './ui/keys';
import { Strip } from './ui/strip';
import { loadScenario } from './sim/scenario';
import { tick, run } from './sim/tick';
import { Record } from './sim/record';
import type { State } from './sim/state';

const stage = document.getElementById('stage')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(style.ground, 1);
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const rig = createRig(renderer.domElement);

// Particle densities are normalised to each flow's mean over a short baseline run.
const base = loadScenario('baseline');
const refs = flowRefs(run(base.state, base.params, ui.refTicks).slice(1));
const view = new OrganismView(refs);
scene.add(view.group);

const inspector = createInspector(renderer.domElement, rig.camera);
inspector.setPickables(view.parts.flatMap((p) => p.pickables));

// ---- Simulation and record ---------------------------------------------------------
let { params, state: s0 } = loadScenario('baseline');
const record = new Record(ui.recordCap);
record.reset(s0);
let viewT = s0.t;
let playing = true;
let speed = ui.defaultSpeed;
let acc = 0;
let lastDrawnT = -1;

const tps = () => ui.speeds[speed];

/** Advance the view one tick: replay from the record, or simulate past its head. */
function advance() {
  if (viewT < record.headT) { viewT += 1; return; }
  const next = tick(record.head(), params);
  record.push(next);
  viewT = next.t;
}

function jumpTo(t: number) {
  const target = Math.max(record.firstT, t);
  while (record.headT < target) advance();
  viewT = Math.min(target, record.headT);
  acc = 0;
  view.clearParticles();
  bindNow();
  view.prewarm(tps());
}

function stateAt(t: number): State { return record.at(t) ?? record.head(); }

function bindNow(alpha = 1) {
  const cur = stateAt(viewT);
  const prev = stateAt(Math.max(record.firstT, viewT - 1));
  view.bind(cur, prev, alpha);
}

// ---- Envelope modes ------------------------------------------------------------------
const modes = ['both', 'loop', 'model'] as const;
let mode = 0;
const wire = { loop: { cur: 0, target: 0 }, model: { cur: 0, target: 0 } };

// ---- Interface ------------------------------------------------------------------------
const strip = new Strip((t) => { jumpTo(t); lastDrawnT = -1; });

bindKeys((intent) => {
  switch (intent.type) {
    case 'camera': rig.goTo(intent.preset); break;
    case 'cycleEnvelopes':
      mode = (mode + 1) % modes.length;
      wire.loop.target = modes[mode] === 'model' ? 1 : 0;
      wire.model.target = modes[mode] === 'loop' ? 1 : 0;
      break;
    case 'togglePlay': playing = !playing; acc = 0; break;
    case 'step':
      playing = false;
      acc = 0;
      if (intent.by > 0) advance(); else viewT = Math.max(record.firstT, viewT - 1);
      break;
    case 'scrub': jumpTo(viewT + intent.by); break;
    case 'speed': speed = intent.index; break;
    case 'toggleStrip': strip.toggle(); break;
  }
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  rig.resize(w, h);
  view.setViewport(h * renderer.getPixelRatio(), style.camera.fov);
  lastDrawnT = -1;
}
window.addEventListener('resize', resize);
resize();
bindNow();
view.prewarm(tps());

// ---- Frame loop ------------------------------------------------------------------------
let last = performance.now();
const fps = { frames: 0, since: last, value: 0 };
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (playing) {
    acc += dt * tps();
    let n = 0;
    while (acc >= 1 && n < ui.maxTicksPerFrame) { advance(); acc -= 1; n++; }
    if (n === ui.maxTicksPerFrame) acc = 0;
  }
  bindNow(playing ? acc : 1);
  view.frame(dt, tps(), playing);

  if (viewT !== lastDrawnT) {
    const from = Math.max(record.firstT, viewT - style.traces.window);
    view.traces.set(record.series((s) => s.M1.alignment_to_usage, from, viewT), record.series((s) => s.M1.alignment_to_usefulness, from, viewT));
    strip.draw(record, viewT);
    lastDrawnT = viewT;
  }

  const step = dt * 1000 / style.fadeMs;
  for (const g of [wire.loop, wire.model]) {
    g.cur = g.cur < g.target ? Math.min(g.target, g.cur + step) : Math.max(g.target, g.cur - step);
  }
  for (const p of view.parts) {
    const grp = p.level === 'envelope' ? p.envelopeOf! : p.level === 'env' ? null : p.level;
    if (grp) p.setWire(wire[grp].cur);
  }

  rig.update(now);
  renderer.render(scene, rig.camera);

  fps.frames++;
  if (now - fps.since > 1000) { fps.value = (fps.frames * 1000) / (now - fps.since); fps.frames = 0; fps.since = now; }
});

// Exposed for headless checks.
(window as unknown as { __organism: object }).__organism = {
  parts: view.parts.map((p) => p.id), rig, scene, view, record,
  get viewT() { return viewT; }, get playing() { return playing; }, get fps() { return fps.value; },
  load(id: string) { const l = loadScenario(id); params = l.params; s0 = l.state; record.reset(s0); viewT = 0; view.clearParticles(); bindNow(); },
};
