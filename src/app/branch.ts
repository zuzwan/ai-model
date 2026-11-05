// A branch: one organism run (params, record, scene). The fork key adds a second branch.
import * as THREE from 'three';
import { type Params, clone } from '../sim/params';
import type { State } from '../sim/state';
import { Record as StateRecord } from '../sim/record';
import { tick } from '../sim/tick';
import { loadScenario } from '../sim/scenario';
import { OrganismView } from '../scene/organism';
import ui from '../ui/ui.json';

export class Branch {
  params!: Params;
  scenarioId = 'baseline';
  seed = 0;
  readonly record = new StateRecord(ui.recordCap);
  readonly scene = new THREE.Scene();
  readonly view: OrganismView;

  constructor(refs: Record<string, number>) {
    this.view = new OrganismView(refs);
    this.scene.add(this.view.group);
  }

  load(id: string, seed?: number): void {
    const l = loadScenario(id, seed);
    this.scenarioId = id;
    this.seed = seed ?? l.scenario.seed;
    this.params = l.params;
    this.record.reset(l.state);
    this.syncView();
  }

  /** Start this branch from another branch's state at tick t with a new seed. */
  forkFrom(other: Branch, t: number, seed: number): void {
    this.params = clone(other.params);
    this.scenarioId = other.scenarioId;
    this.seed = seed;
    this.record.reset(other.record.fork(t, seed)!);
    this.syncView();
  }

  get firstT() { return this.record.firstT; }
  get headT() { return this.record.headT; }

  /** Make sure the record reaches tick t, simulating past its head. */
  ensure(t: number): void {
    while (this.record.headT < t) this.record.push(tick(this.record.head(), this.params));
  }

  stateAt(t: number): State {
    return this.record.at(Math.max(this.record.firstT, Math.min(t, this.record.headT))) ?? this.record.head();
  }

  /** A viewer perturbation of state at tick t: the future after t is recomputed. */
  editState(t: number, fn: (s: State) => void): void {
    this.ensure(t);
    const s = structuredClone(this.stateAt(t));
    fn(s);
    this.record.replace(s.t, s);
  }

  /** A viewer change of params from tick t on: the future after t is recomputed. */
  editParams(t: number, fn: (p: Params) => void): void {
    this.ensure(t);
    this.record.truncateAfter(Math.max(this.record.firstT, Math.min(t, this.record.headT)));
    fn(this.params);
    this.syncView();
  }

  syncView(): void {
    this.view.viewerApertures = this.params.apertures;
    for (const f of Object.keys(this.params.valves)) this.view.setValve(f, this.params.valves[f]);
  }
}
