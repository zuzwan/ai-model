import { describe, it, expect } from 'vitest';
import { Record } from '../src/sim/record';
import { loadScenario } from '../src/sim/scenario';
import { tick } from '../src/sim/tick';

describe('record', () => {
  it('keeps the last cap states and answers at(t)', () => {
    const { state, params } = loadScenario('baseline');
    const r = new Record(100);
    r.reset(state);
    let s = state;
    for (let i = 0; i < 250; i++) { s = tick(s, params); r.push(s); }
    expect(r.headT).toBe(250);
    expect(r.firstT).toBe(151);
    expect(r.at(200)?.t).toBe(200);
    expect(r.at(150)).toBeUndefined();
  });

  it('replaying from the record is identical to the original run', () => {
    const { state, params } = loadScenario('baseline');
    const r = new Record(4000);
    r.reset(state);
    let s = state;
    for (let i = 0; i < 300; i++) { s = tick(s, params); r.push(s); }
    let replay = r.at(100)!;
    for (let i = 0; i < 200; i++) replay = tick(replay, params);
    expect(replay).toEqual(r.at(300));
  });

  it('fork reseeds without touching the original', () => {
    const { state, params } = loadScenario('baseline');
    const r = new Record(4000);
    r.reset(state);
    let s = state;
    for (let i = 0; i < 50; i++) { s = tick(s, params); r.push(s); }
    const f = r.fork(50, 99)!;
    expect(f.t).toBe(50);
    expect(f.rng).not.toBe(r.at(50)!.rng);
    f.L5.reserve = -1;
    expect(r.at(50)!.L5.reserve).toBeGreaterThan(0);
  });
});
