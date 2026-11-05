// Context layer: names on every part, a guide panel, a top bar, and names for hover readouts.
import * as THREE from 'three';
import guide from './guide.json';
import { ontology, componentById, flowById, surfaceById, substanceById } from '../sim/ontology';
import { scenarios } from '../sim/scenario';

const blurbs = guide.components as Record<string, string>;
const subNames = guide.substances as Record<string, string>;

/** A human name for any pickable id. */
export function nameOf(id: string): string {
  if (componentById.has(id)) return componentById.get(id)!.name;
  if (surfaceById.has(id)) return `${surfaceById.get(id)!.name} surface`;
  if (id === 'loop') return 'Loop';
  if (id === 'model') return 'Model';
  if (id === 'L6.objective') return 'Reward objective';
  if (id === 'hidden') return 'Hidden variables';
  const f = flowById.get(id);
  if (f) {
    const from = componentById.get(f.from)?.name ?? f.from;
    const to = componentById.get(f.to)?.name ?? f.to;
    return `${subNames[f.substance] ?? f.substance}: ${from} → ${to}`;
  }
  return id;
}

export function blurbOf(id: string): string {
  return blurbs[id] ?? '';
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ---- Labels --------------------------------------------------------------------------------

interface Tag { id: string; pos: THREE.Vector3; el: HTMLDivElement; level: string }

export class Labels {
  readonly root = el('div', 'tags');
  private tags: Tag[] = [];
  visible = true;
  private v = new THREE.Vector3();

  constructor() {
    const add = (id: string, pos: THREE.Vector3, level: string) => {
      const t = el('div', `tag tag-${level}`);
      t.append(el('span', 'tag-id', id.length <= 3 ? id : ''), el('span', 'tag-name', nameOf(id)));
      this.root.appendChild(t);
      this.tags.push({ id, pos, el: t, level });
    };
    for (const c of ontology.components) {
      const l = c.layout;
      const top = c.level === 'env' ? l.y + Math.min(l.h, 0.02) / 2 : l.y + l.h / 2;
      add(c.id, new THREE.Vector3(l.x, top, l.z), c.level);
    }
    for (const e of ontology.envelopes) {
      const l = e.layout;
      add(e.id, new THREE.Vector3(l.x - l.w / 2 + l.w * 0.12, l.y + l.h / 2, l.z + l.d / 2), 'envelope');
    }
    for (const s of ontology.surfaces) {
      if (!s.layout.membrane) continue;
      add(s.id, new THREE.Vector3(s.layout.x, s.layout.y - s.layout.h / 2, s.layout.z), 'surface');
    }
    document.body.appendChild(this.root);
  }

  setVisible(on: boolean) {
    this.visible = on;
    this.root.classList.toggle('off', !on);
  }

  setActive(id: string | null) {
    for (const t of this.tags) t.el.classList.toggle('active', t.id === id);
  }

  /** Place tags for a camera drawn into a viewport `w` x `h` at the page's top left. */
  update(camera: THREE.Camera, w: number, h: number) {
    if (!this.visible) return;
    const placed: DOMRect[] = [];
    const items = this.tags.map((t) => {
      this.v.copy(t.pos).project(camera);
      return { t, x: (this.v.x * 0.5 + 0.5) * w, y: (-this.v.y * 0.5 + 0.5) * h, z: this.v.z };
    }).sort((a, b) => a.z - b.z);
    for (const { t, x, y, z } of items) {
      const tw = t.el.offsetWidth;
      const th = t.el.offsetHeight;
      let shown = false;
      if (z < 1 && x > -tw && x < w + tw && y > 0 && y < h) {
        for (let k = 0; k < 4 && !shown; k++) {
          const lead = 8 + k * (th + 2);
          const r = new DOMRect(x - tw / 2, y - lead - th, tw, th);
          if (!placed.some((p) => r.left < p.right + 3 && r.right > p.left - 3 && r.top < p.bottom + 1 && r.bottom > p.top - 1)) {
            placed.push(r);
            t.el.style.transform = `translate(${Math.round(r.left)}px, ${Math.round(r.top)}px)`;
            t.el.style.setProperty('--lead', `${lead}px`);
            shown = true;
          }
        }
      }
      t.el.classList.toggle('hidden', !shown && !t.el.classList.contains('active'));
    }
  }
}

// ---- Guide panel ---------------------------------------------------------------------------

export class Guide {
  readonly el = el('aside', 'guide');
  private scenarioName = el('div', 'guide-scenario');
  private scenarioText = el('p', 'guide-scenario-text');
  open = false;

  constructor(onScenario: (id: string) => void, onClose: () => void) {
    const close = el('button', 'guide-close', '×');
    close.setAttribute('aria-label', 'Close guide');
    close.addEventListener('click', onClose);
    const head = el('header');
    head.append(el('h1', undefined, guide.title), close);

    const now = el('section', 'guide-now');
    now.append(el('h2', undefined, 'Now running'), this.scenarioName, this.scenarioText);

    const intro = el('section');
    for (const p of guide.intro) intro.appendChild(el('p', undefined, p));

    const read = el('section');
    read.appendChild(el('h2', undefined, 'How to read it'));
    const dl = el('dl');
    for (const [k, v] of guide.read) dl.append(el('dt', undefined, k), el('dd', undefined, v));
    read.appendChild(dl);

    const legend = el('section');
    legend.appendChild(el('h2', undefined, 'What flows'));
    const ul = el('ul', 'legend');
    for (const s of ontology.substances) {
      const li = el('li');
      const dot = el('span', 'swatch');
      dot.style.background = substanceById.get(s.id)!.particle.color;
      li.append(dot, el('span', undefined, subNames[s.id] ?? s.id));
      ul.appendChild(li);
    }
    legend.appendChild(ul);

    const strip = el('section');
    strip.appendChild(el('h2', undefined, 'Bottom strip'));
    const sdl = el('dl');
    for (const [k, [name, text]] of Object.entries(guide.strip)) sdl.append(el('dt', undefined, `${k} ${name}`), el('dd', undefined, text));
    strip.appendChild(sdl);

    const sc = el('section');
    sc.appendChild(el('h2', undefined, 'Scenarios'));
    const order = ['0', 'q', 'w', 'e', 'r', 't', 'y'];
    const list = el('ul', 'scenarios');
    for (const s of [...scenarios].sort((a, b) => order.indexOf(a.key ?? '') - order.indexOf(b.key ?? ''))) {
      const b = el('button');
      b.append(el('kbd', undefined, s.key ?? ''), el('span', 'sc-name', s.name), el('span', 'sc-text', (guide.scenarios as Record<string, string>)[s.id] ?? ''));
      b.addEventListener('click', () => onScenario(s.id));
      const li = el('li');
      li.appendChild(b);
      list.appendChild(li);
    }
    sc.appendChild(list);

    const keys = el('section');
    keys.appendChild(el('h2', undefined, 'Controls'));
    const kdl = el('dl', 'keys');
    for (const [k, v] of guide.controls) kdl.append(el('dt', undefined, k), el('dd', undefined, v));
    keys.appendChild(kdl);

    this.el.append(head, now, intro, read, legend, strip, sc, keys);
    document.body.appendChild(this.el);
  }

  setScenario(id: string) {
    const s = scenarios.find((x) => x.id === id);
    this.scenarioName.textContent = s?.name ?? id;
    this.scenarioText.textContent = (guide.scenarios as Record<string, string>)[id] ?? '';
  }

  toggle(on = !this.open) {
    this.open = on;
    this.el.classList.toggle('open', on);
    document.body.classList.toggle('guide-open', on);
  }
}

// ---- Top bar -------------------------------------------------------------------------------

export interface BarActions { guide(): void; play(): void; speed(i: number): void; labels(): void; scenario(id: string): void }

export class TopBar {
  readonly el = el('nav', 'bar');
  private text = el('span', 'bar-text');
  private playBtn = el('button', 'bar-btn');
  private speedBtns: HTMLButtonElement[] = [];
  private labelBtn = el('button', 'bar-btn', 'Labels');
  private guideBtn = el('button', 'bar-btn bar-guide', 'Guide');

  constructor(speeds: number[], a: BarActions) {
    const left = el('div', 'bar-left');
    this.guideBtn.addEventListener('click', a.guide);
    const sel = el('select', 'bar-select');
    for (const s of scenarios) {
      const o = el('option', undefined, s.name);
      o.value = s.id;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => { a.scenario(sel.value); sel.blur(); });
    this.select = sel;
    left.append(this.guideBtn, sel, this.text);

    const right = el('div', 'bar-right');
    this.playBtn.addEventListener('click', a.play);
    const sp = el('span', 'bar-speeds');
    speeds.forEach((v, i) => {
      const b = el('button', 'bar-btn', `${v}×`);
      b.title = `${v} days per second`;
      b.addEventListener('click', () => a.speed(i));
      this.speedBtns.push(b);
      sp.appendChild(b);
    });
    this.labelBtn.addEventListener('click', a.labels);
    right.append(this.playBtn, sp, this.labelBtn);
    this.el.append(left, right);
    // Buttons never keep focus, so the keyboard stays with the scene.
    this.el.addEventListener('mouseup', () => (document.activeElement as HTMLElement | null)?.blur());
    document.body.appendChild(this.el);
  }

  private select: HTMLSelectElement;

  update(o: { scenario: string; playing: boolean; speed: number; labels: boolean; guide: boolean }) {
    this.select.value = o.scenario;
    this.text.textContent = (guide.scenarios as Record<string, string>)[o.scenario] ?? '';
    this.playBtn.textContent = o.playing ? 'Pause' : 'Play';
    this.speedBtns.forEach((b, i) => b.classList.toggle('on', i === o.speed));
    this.labelBtn.classList.toggle('on', o.labels);
    this.guideBtn.classList.toggle('on', o.guide);
  }
}
