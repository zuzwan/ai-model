import { describe, it, expect } from 'vitest';
import { loadScenario } from '../src/sim/scenario';
import { run } from '../src/sim/tick';

describe('determinism', () => {
  it('same seed and params give identical trajectories', () => {
    const a = loadScenario('baseline', 7);
    const b = loadScenario('baseline', 7);
    const ra = run(a.state, a.params, 1500);
    const rb = run(b.state, b.params, 1500);
    expect(JSON.stringify(ra[1500])).toBe(JSON.stringify(rb[1500]));
    for (let t = 0; t <= 1500; t += 50) expect(ra[t]).toEqual(rb[t]);
  });

  it('different seeds give different trajectories', () => {
    const a = loadScenario('baseline', 1);
    const b = loadScenario('baseline', 2);
    const ra = run(a.state, a.params, 300);
    const rb = run(b.state, b.params, 300);
    expect(ra[300].E1.consumer.demand).not.toBe(rb[300].E1.consumer.demand);
  });

  it('tick does not mutate its input', () => {
    const a = loadScenario('baseline', 3);
    const before = JSON.stringify(a.state);
    run(a.state, a.params, 10);
    expect(JSON.stringify(a.state)).toBe(before);
  });
});
