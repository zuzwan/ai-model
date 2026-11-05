import { describe, it, expect } from 'vitest';
import { Branch } from '../src/app/branch';
import { flowRefs } from '../src/scene/organism';
import { loadScenario } from '../src/sim/scenario';
import { run } from '../src/sim/tick';

const base = loadScenario('baseline');
const refs = flowRefs(run(base.state, base.params, 30).slice(1));

describe('viewer perturbations', () => {
  it('a valve change recomputes the future from the current tick', () => {
    const b = new Branch(refs);
    b.load('baseline');
    b.ensure(200);
    const before = b.stateAt(150).flows.F14;
    b.editParams(100, (p) => { p.valves.F14 = 0; });
    expect(b.headT).toBe(100);
    b.ensure(107);
    expect(b.stateAt(107).flows.F14).toBe(0);
    expect(before).toBeGreaterThan(0);
  });

  it('a stock injection shows within seven ticks', () => {
    const b = new Branch(refs);
    b.load('baseline');
    b.ensure(50);
    b.editState(50, (s) => { s.L9.legitimacy = 0.1; });
    b.ensure(57);
    expect(b.stateAt(57).L9.gate_open).toBe(false);
    expect(b.stateAt(57).flows.F8).toBe(0);
  });

  it('closing an aperture cuts its inbound flow on the next tick', () => {
    const b = new Branch(refs);
    b.load('baseline');
    b.ensure(40);
    b.editParams(40, (p) => { p.apertures.S1 = [0, 1]; });
    b.ensure(41);
    expect(b.stateAt(41).L4.consumer.request_rate).toBe(0);
    expect(b.stateAt(41).L4.enterprise.request_rate).toBeGreaterThan(0);
  });

  it('setting the objective moves the drift anchor', () => {
    const b = new Branch(refs);
    b.load('baseline');
    b.editState(0, (s) => { s.L6.w_usage = 0.7; s.L6.w_usefulness = 0.1; s.L6.w_safety = 0.2; s.L6.w_anchor = 0.7; });
    b.ensure(60);
    expect(b.stateAt(60).L6.w_usage).toBeGreaterThan(0.65);
  });

  it('a fork shares history to the fork tick and then diverges by seed', () => {
    const a = new Branch(refs);
    a.load('baseline');
    a.ensure(100);
    const f = new Branch(refs);
    f.forkFrom(a, 100, 12345);
    expect(f.firstT).toBe(100);
    a.ensure(400); f.ensure(400);
    expect(f.stateAt(400).E1.consumer.demand).not.toBe(a.stateAt(400).E1.consumer.demand);
  });
});
