// The bottom strip: tick index, generation, six sparklines (W U V G R Λ) and the time rail.
// The only persistent text on screen. Hidden with H.
import ui from './ui.json';
import guide from './guide.json';
import type { Record as StateRecord } from '../sim/record';
import { core, type State } from '../sim/state';

const KEYS = ['W', 'U', 'V', 'G', 'R', 'Λ'] as const;
const NAMES = guide.strip as unknown as Record<string, [string, string]>;
type Key = (typeof KEYS)[number];
const pick = (s: State): Record<Key, number> => {
  const c = core(s);
  return { W: c.W, U: c.U, V: c.V, G: c.G, R: c.R, 'Λ': c.Lambda };
};

export class Strip {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onScrub: (t: number) => void;
  private dragging = false;
  private range = { first: 0, head: 0 };
  visible = true;

  constructor(onScrub: (t: number) => void) {
    this.onScrub = onScrub;
    this.el = document.createElement('div');
    this.el.className = 'strip';
    this.el.style.height = `${ui.strip.height}px`;
    this.canvas = document.createElement('canvas');
    this.el.appendChild(this.canvas);
    document.body.appendChild(this.el);
    this.ctx = this.canvas.getContext('2d')!;
    const rail = (ev: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      const g = ui.strip.gutter;
      const f = Math.min(1, Math.max(0, (ev.clientX - r.left - g) / (r.width - 2 * g)));
      this.onScrub(Math.round(this.range.first + f * (this.range.head - this.range.first)));
    };
    this.canvas.addEventListener('pointerdown', (ev) => {
      const r = this.canvas.getBoundingClientRect();
      if (ev.clientY - r.top < r.height - ui.strip.railHeight - 4) return;
      this.dragging = true;
      this.canvas.setPointerCapture(ev.pointerId);
      rail(ev);
    });
    this.canvas.addEventListener('pointermove', (ev) => { if (this.dragging) rail(ev); });
    this.canvas.addEventListener('pointerup', () => { this.dragging = false; });
  }

  toggle() {
    this.visible = !this.visible;
    this.el.style.opacity = this.visible ? '1' : '0';
    this.el.style.pointerEvents = this.visible ? 'auto' : 'none';
  }

  /** Draw the primary branch; a fork, when present, is overlaid in grey with its fork point on the rail. */
  draw(rec: StateRecord, viewT: number, fork?: StateRecord) {
    if (!this.visible) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const W = this.el.clientWidth;
    const H = ui.strip.height;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
      this.canvas.style.width = `${W}px`;
      this.canvas.style.height = `${H}px`;
    }
    const c = this.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const S = ui.strip;
    const g = S.gutter;
    const cur = rec.at(viewT) ?? rec.head();
    c.font = `400 ${S.labelPx}px Lexend, sans-serif`;
    c.fillStyle = S.ink;
    c.textBaseline = 'middle';
    const lineY = (H - S.railHeight) / 2;
    const narrow = W < 640;
    const tText = `t ${viewT}`;
    const nText = `N ${cur.L10.active_generation}`;
    c.fillText(tText, g, lineY);
    const tW = narrow ? 52 : 64;
    c.fillText(nText, g + tW, lineY);
    const x0 = g + tW + (narrow ? 34 : 44);
    const cell = (W - x0 - g) / KEYS.length;
    const from = Math.max(rec.firstT, viewT - S.window);
    const series = rec.series(pick, from, viewT);
    const forkSeries = fork ? fork.series(pick, Math.max(fork.firstT, from), Math.min(viewT, fork.headT)) : [];
    const forkOffset = fork ? Math.max(fork.firstT, from) - from : 0;
    KEYS.forEach((k, i) => {
      const cx = x0 + i * cell;
      c.fillStyle = S.ink;
      const label = narrow ? k : `${k} ${NAMES[k][0]}`;
      c.fillText(label, cx, lineY);
      const lw = c.measureText(label).width;
      const sx = cx + lw + 8;
      const sw = Math.max(10, cell - lw - 18);
      const sh = H - S.railHeight - 14;
      const sy = 6;
      const [lo, hi] = S.ranges[k] as [number, number];
      const vals = series.map((v) => v[k]);
      const fvals = forkSeries.map((v) => v[k]);
      const hiEff = k === 'R' || k === 'U' ? Math.max(hi * 0.25, ...vals, ...fvals) * 1.05 : hi;
      const y = (v: number) => sy + sh - ((Math.min(hiEff, Math.max(lo, v)) - lo) / (hiEff - lo)) * sh;
      if (fvals.length) {
        c.strokeStyle = S.grey;
        c.lineWidth = S.lineWidth;
        c.beginPath();
        fvals.forEach((v, j) => {
          const px = sx + ((j + forkOffset) / S.window) * sw;
          if (j === 0) c.moveTo(px, y(v)); else c.lineTo(px, y(v));
        });
        c.stroke();
      }
      c.strokeStyle = S.ink;
      c.lineWidth = S.lineWidth;
      c.beginPath();
      vals.forEach((v, j) => {
        const px = sx + (j / S.window) * sw;
        if (j === 0) c.moveTo(px, y(v)); else c.lineTo(px, y(v));
      });
      c.stroke();
      if (vals.length) {
        c.fillStyle = S.ink;
        c.beginPath();
        c.arc(sx + ((vals.length - 1) / S.window) * sw, y(vals[vals.length - 1]), 1.8, 0, Math.PI * 2);
        c.fill();
      }
    });
    // Time rail: the recorded span, with the view cursor.
    this.range = { first: rec.firstT, head: rec.headT };
    const ry = H - S.railHeight / 2;
    const rw = W - 2 * g;
    c.strokeStyle = S.grey;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(g, ry); c.lineTo(g + rw, ry); c.stroke();
    const span = Math.max(1, rec.headT - rec.firstT);
    const cx = g + ((viewT - rec.firstT) / span) * rw;
    c.strokeStyle = S.ink;
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(g, ry); c.lineTo(cx, ry); c.stroke();
    c.fillStyle = S.ink;
    c.fillRect(cx - 1, ry - 4, 2, 8);
    if (fork) {
      const fx = g + ((fork.firstT - rec.firstT) / span) * rw;
      c.strokeStyle = S.ink;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(fx, ry - 4); c.lineTo(fx + 4, ry - 8); c.moveTo(fx, ry - 4); c.lineTo(fx + 4, ry); c.stroke();
    }
  }
}
