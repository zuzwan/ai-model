// Ring buffer of states for scrub and fork. Stores the last `cap` ticks.
import type { State } from './state';
import { seedToState } from './rng';

export class Record {
  private states: State[] = [];
  constructor(readonly cap: number) {}

  reset(s: State): void { this.states = [s]; }
  push(s: State): void {
    this.states.push(s);
    if (this.states.length > this.cap) this.states.shift();
  }
  get firstT(): number { return this.states[0]?.t ?? 0; }
  get headT(): number { return this.states[this.states.length - 1]?.t ?? 0; }
  head(): State { return this.states[this.states.length - 1]; }
  at(t: number): State | undefined {
    const i = t - this.firstT;
    return i >= 0 && i < this.states.length ? this.states[i] : undefined;
  }
  /** Drop everything after tick t (a perturbation while scrubbed back starts a new branch). */
  truncateAfter(t: number): void {
    const i = t - this.firstT;
    if (i >= 0 && i < this.states.length - 1) this.states.length = i + 1;
  }
  /** A copy of the state at tick t with a new random stream. */
  fork(t: number, seed: number): State | undefined {
    const s = this.at(t);
    if (!s) return undefined;
    const f = structuredClone(s);
    f.rng = seedToState(seed);
    return f;
  }
  /** Values of one quantity over the record, for sparklines. */
  series<T = number>(fn: (s: State) => T, from = this.firstT, to = this.headT): T[] {
    const out: T[] = [];
    for (let t = from; t <= to; t++) { const s = this.at(t); if (s) out.push(fn(s)); }
    return out;
  }
}
