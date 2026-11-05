// Wires the simulation loop, the record, the scene and the interface.
import * as THREE from 'three';
import style from './scene/style.json';
import ui from './ui/ui.json';
import { createRig } from './scene/camera';
import { flowRefs } from './scene/organism';
import { Interaction } from './ui/interact';
import { bindKeys } from './ui/keys';
import { Strip } from './ui/strip';
import { Menu } from './ui/menu';
import { Labels, Guide, TopBar } from './ui/context';
import { readHash, writeHash, isOwnHash } from './ui/hash';
import { loadScenario, scenarioById } from './sim/scenario';
import { run } from './sim/tick';
import { Branch } from './app/branch';
import { surfaceById } from './sim/ontology';

const stage = document.getElementById('stage')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(style.ground, 1);
stage.appendChild(renderer.domElement);
const fadeEl = document.createElement('div');
fadeEl.className = 'fade';
document.body.appendChild(fadeEl);

const rig = createRig(renderer.domElement);

// Particle densities are normalised to each flow's mean over a short baseline run.
const base = loadScenario('baseline');
const refs = flowRefs(run(base.state, base.params, ui.refTicks).slice(1));

// ---- Branches and time ---------------------------------------------------------------
const primary = new Branch(refs);
let fork: Branch | null = null;
let forkPool: Branch | null = null;
const branches = () => (fork ? [primary, fork] : [primary]);
let viewT = 0;
let playing = true;
let speed = ui.defaultSpeed;
let acc = 0;
let dirty = true;
const tps = () => ui.speeds[speed];

/** Advance the view one tick: replay from the records, or simulate past their heads. */
function advance() {
  viewT += 1;
  for (const b of branches()) b.ensure(viewT);
}

function bindAll(alpha = 1) {
  for (const b of branches()) {
    const cur = b.stateAt(viewT);
    const prev = b.stateAt(viewT - 1);
    b.view.bind(cur, prev, viewT - 1 < b.firstT ? 1 : alpha);
  }
}

function jumpTo(t: number) {
  const target = Math.max(primary.firstT, t);
  for (const b of branches()) b.ensure(target);
  viewT = target;
  acc = 0;
  for (const b of branches()) b.view.clearParticles();
  bindAll();
  for (const b of branches()) b.view.prewarm(tps());
  dirty = true;
}

function cut() {
  fadeEl.className = 'fade cut';
  void fadeEl.offsetWidth;
  fadeEl.className = 'fade out';
}

function loadScenarioInto(id: string, t = 0, seed?: number) {
  if (!scenarioById.has(id)) id = 'baseline';
  cut();
  closeFork();
  primary.load(id, seed);
  primary.view.setSelected(null);
  viewT = primary.firstT;
  jumpTo(t);
  playing = true;
  guidePanel.setScenario(primary.scenarioId);
  writeHash({ scenario: primary.scenarioId, t: viewT });
}

function openFork() {
  cut();
  fork = forkPool ?? new Branch(refs);
  forkPool = fork;
  fork.forkFrom(primary, viewT, primary.seed + 1 + Math.floor(Math.random() * 1e6));
  fork.view.setUmwelt(umwelt);
  resize();
  jumpTo(viewT);
}

function closeFork() {
  if (!fork) return;
  fork = null;
  resize();
}

// ---- Envelope modes and Umwelt ---------------------------------------------------------
const modes = ['both', 'loop', 'model'] as const;
let mode = 0;
const wire = { loop: { cur: 0, target: 0 }, model: { cur: 0, target: 0 } };
let umwelt = false;

// ---- Interface ---------------------------------------------------------------------------
const strip = new Strip((t) => jumpTo(t));
const menu = new Menu((id) => loadScenarioInto(id));

const labels = new Labels();
const guidePanel = new Guide((id) => loadScenarioInto(id), () => toggleGuide(false));
function toggleGuide(on?: boolean) {
  guidePanel.toggle(on);
  try { localStorage.setItem('organism.guideSeen', '1'); } catch { /* storage may be unavailable */ }
  resize();
}
const bar = new TopBar(ui.speeds, {
  guide: () => toggleGuide(),
  play: () => { playing = !playing; acc = 0; },
  speed: (i) => { speed = i; },
  labels: () => labels.setVisible(!labels.visible),
  scenario: (id) => loadScenarioInto(id),
});

const interaction = new Interaction(renderer.domElement, rig.camera, rig.controls, branches, () => viewT, {
  setAperture(b, s, i, v) {
    b.editParams(viewT, (p) => {
      const n = Math.max(1, surfaceById.get(s)?.apertures.length ?? 1, i + 1);
      const arr = p.apertures[s] ?? Array.from({ length: n }, () => 1);
      arr[i] = v;
      p.apertures[s] = arr;
    });
    dirty = true;
  },
  setStock(b, id, frac) {
    const sc = (style.fills as Record<string, { scale: number }>)[id].scale * frac;
    b.editState(viewT, (s) => {
      if (id === 'L1') s.L1.corpus_human = sc;
      if (id === 'L3') s.L3.capacity = sc;
      if (id === 'L5') s.L5.reserve = sc;
      if (id === 'L9') { s.L9.legitimacy = frac; }
    });
    dirty = true;
  },
  setValve(b, f, g) {
    b.editParams(viewT, (p) => { p.valves[f] = g; });
    b.view.setValve(f, g);
    dirty = true;
  },
  setWeights(b, [wu, wv, ws]) {
    b.editState(viewT, (s) => {
      s.L6.w_usage = wu; s.L6.w_usefulness = wv; s.L6.w_safety = ws; s.L6.w_anchor = wu;
    });
    dirty = true;
  },
  select(b, id) {
    for (const x of branches()) x.view.setSelected(x === b ? id : null);
  },
});

interaction.onHover = (id) => labels.setActive(id);

bindKeys((intent) => {
  if (menu.open && intent.type !== 'menu' && intent.type !== 'escape') menu.toggle(false);
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
      if (intent.by > 0) advance(); else viewT = Math.max(primary.firstT, viewT - 1);
      dirty = true;
      break;
    case 'scrub': jumpTo(viewT + intent.by); break;
    case 'speed': speed = intent.index; break;
    case 'toggleStrip': strip.toggle(); break;
    case 'scenario': loadScenarioInto(intent.id); break;
    case 'umwelt':
      umwelt = !umwelt;
      for (const b of branches()) b.view.setUmwelt(umwelt);
      dirty = true;
      break;
    case 'fork': openFork(); break;
    case 'menu': menu.toggle(); break;
    case 'labels': labels.setVisible(!labels.visible); break;
    case 'guide': toggleGuide(); break;
    case 'escape':
      if (menu.open) { menu.toggle(false); break; }
      if (guidePanel.open) { toggleGuide(false); break; }
      loadScenarioInto('baseline', 0, 0);
      break;
  }
});

window.addEventListener('hashchange', () => {
  if (isOwnHash()) return;
  const r = readHash();
  if (r) loadScenarioInto(r.scenario, r.t);
});

function resize() {
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || window.innerHeight;
  renderer.setSize(w, h);
  rig.resize(w / branches().length, h);
  for (const b of branches()) b.view.setViewport(h * renderer.getPixelRatio(), style.camera.fov);
  dirty = true;
}
window.addEventListener('resize', resize);

// ---- Start: the hash route, or the baseline, already running ------------------------------
const route = readHash();
primary.load(route && scenarioById.has(route.scenario) ? route.scenario : 'baseline');
let seen = false;
try { seen = localStorage.getItem('organism.guideSeen') === '1'; } catch { /* storage may be unavailable */ }
guidePanel.setScenario(primary.scenarioId);
if (!seen) guidePanel.toggle(true);
resize();
jumpTo(route?.t ?? 0);

// ---- Frame loop ----------------------------------------------------------------------------
let last = performance.now();
let lastHash = 0;
const fps = { frames: 0, since: last, value: 0 };
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (playing) {
    acc += dt * tps();
    let n = 0;
    while (acc >= 1 && n < ui.maxTicksPerFrame) { advance(); acc -= 1; n++; dirty = true; }
    if (n === ui.maxTicksPerFrame) acc = 0;
  }
  bindAll(playing ? acc : 1);
  for (const b of branches()) b.view.frame(dt, tps(), playing);

  if (dirty) {
    for (const b of branches()) {
      const from = Math.max(b.firstT, viewT - style.traces.window);
      const to = Math.min(viewT, b.headT);
      b.view.traces.set(b.record.series((s) => s.M1.alignment_to_usage, from, to), b.record.series((s) => s.M1.alignment_to_usefulness, from, to));
      if (umwelt) {
        b.view.hidden.set({
          V: b.record.series((s) => s.M1.capability * s.M1.alignment_to_usefulness * (1 - s.M1.contamination_load), from, to),
          G: b.record.series((s) => s.M1.alignment_to_usage - s.M1.alignment_to_usefulness, from, to),
          D: b.record.series((s) => {
            const u = s.E1.consumer.demand + s.E1.enterprise.demand;
            return u > 0 ? (s.E1.consumer.dependence * s.E1.consumer.demand + s.E1.enterprise.dependence * s.E1.enterprise.demand) / u : 0;
          }, from, to),
        });
      }
    }
    strip.draw(primary.record, viewT, fork?.record);
    dirty = false;
  }
  if (now - lastHash > ui.hashWriteMs) { writeHash({ scenario: primary.scenarioId, t: viewT }); lastHash = now; }

  const step = (dt * 1000) / style.fadeMs;
  for (const g of [wire.loop, wire.model]) {
    g.cur = g.cur < g.target ? Math.min(g.target, g.cur + step) : Math.max(g.target, g.cur - step);
  }
  for (const b of branches()) {
    for (const p of b.view.parts) {
      const grp = p.level === 'envelope' ? p.envelopeOf! : p.level === 'env' ? null : p.level;
      if (grp) p.setWire(wire[grp].cur);
    }
  }

  rig.update(now);
  const list = branches();
  const W = renderer.domElement.clientWidth;
  const H = renderer.domElement.clientHeight;
  if (list.length === 1) {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    renderer.render(primary.scene, rig.camera);
  } else {
    // Fork view: split the viewport, both organisms sharing the camera.
    renderer.setScissorTest(true);
    const w = W / list.length;
    list.forEach((b, i) => {
      renderer.setViewport(i * w, 0, w, H);
      renderer.setScissor(i * w, 0, w, H);
      renderer.render(b.scene, rig.camera);
    });
  }

  labels.root.classList.toggle('off', !labels.visible || list.length > 1);
  if (list.length === 1) labels.update(rig.camera, W, H);
  bar.update({ scenario: primary.scenarioId, playing, speed, labels: labels.visible, guide: guidePanel.open });

  fps.frames++;
  if (now - fps.since > 1000) { fps.value = (fps.frames * 1000) / (now - fps.since); fps.frames = 0; fps.since = now; }
});

// Exposed for headless checks.
(window as unknown as { __organism: object }).__organism = {
  primary, rig, get fork() { return fork; }, get viewT() { return viewT; }, get playing() { return playing; }, get fps() { return fps.value; },
};
