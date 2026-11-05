import { describe, it, expect } from 'vitest';
import { scenarios, loadScenario } from '../src/sim/scenario';
import { run } from '../src/sim/tick';
import { check, horizon } from '../src/sim/probe';

describe('pathology presets reproduce their expected trajectories', () => {
  for (const sc of scenarios) {
    describe(sc.name, () => {
      const { state, params } = loadScenario(sc.id);
      const states = run(state, params, horizon(sc.expect));
      for (const e of sc.expect) {
        it(e.why ?? `${e.var} ${e.op} ${e.value} @${e.at}`, () => {
          const v = check(states, e);
          expect(v.pass, `${e.var} = ${v.actual.toFixed(4)} ${e.op} ${v.target.toFixed(4)}`).toBe(true);
        });
      }
    });
  }

  it('every pathology preset has expectations and a key', () => {
    expect(scenarios.length).toBe(7);
    for (const sc of scenarios) {
      expect(sc.expect.length).toBeGreaterThan(0);
      expect(sc.key).toBeDefined();
    }
  });
});
