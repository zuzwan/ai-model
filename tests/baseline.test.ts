import { describe, it, expect } from 'vitest';
import { loadScenario } from '../src/sim/scenario';
import { run } from '../src/sim/tick';
import { core } from '../src/sim/state';

describe('baseline', () => {
  const { state, params } = loadScenario('baseline');
  const states = run(state, params, 1500);

  it('stays viable for 1,500 ticks with default parameters', () => {
    for (const s of states) {
      expect(s.alive).toBe(true);
      expect(s.L7.deprecate_flag).toBe(false);
      const c = core(s);
      expect(c.Lambda).toBeGreaterThan(params.L9.Lambda_min);
      expect(c.R).toBeGreaterThan(0);
      expect(c.H).toBeGreaterThan(0.6);
      expect(c.C).toBeGreaterThan(0.5);
      expect(s.L11.know_how).toBeGreaterThan(params.L2.know_how_floor);
    }
  });

  it('advances generations', () => {
    expect(states[1500].L10.active_generation).toBeGreaterThan(5);
  });

  it('all state stays finite', () => {
    const bad = JSON.stringify(states[1500]).match(/null|NaN|Infinity/g);
    expect(bad?.filter((b) => b !== 'null') ?? []).toEqual([]);
  });

  it('M1 changes only on release (F7 at a generation event)', () => {
    for (let i = 1; i < states.length; i++) {
      const a = states[i - 1].M1, b = states[i].M1;
      if (a.capability !== b.capability) expect(states[i].L7.release_flag).toBe(true);
    }
  });
});
