import { describe, it, expect } from 'vitest';
import { loadScenario, scenarios } from '../src/sim/scenario';
import { tick } from '../src/sim/tick';
import { withOverrides } from '../src/sim/params';

const SPEND = ['F16', 'F17', 'F18', 'F19', 'F20'];

function checkCurrency(id: string, n: number, overrides: Record<string, unknown> = {}) {
  const { state, params: base } = loadScenario(id);
  const params = withOverrides(base, overrides);
  let s = state;
  for (let i = 0; i < n; i++) {
    const next = tick(s, params);
    const inflow = next.flows.F14 + next.flows.F15;
    const outflow = SPEND.reduce((a, f) => a + next.flows[f], 0);
    // Every unit entering through F14 or F15 is held in L5 or spent through F16..F20.
    expect(next.L5.reserve - s.L5.reserve, `${id} tick ${s.t}`).toBeCloseTo(inflow - outflow, 9);
    expect(next.L5.reserve).toBeGreaterThanOrEqual(0);
    s = next;
  }
}

describe('currency conservation inside the loop envelope', () => {
  it('holds every tick on the baseline', () => checkCurrency('baseline', 1500));
  it('holds under valves and apertures', () =>
    checkCurrency('baseline', 600, { valves: { F14: 0.3, F16: 2, F20: 0 }, apertures: { S3: [0.2], S1: [0.5, 1] } }));
  it('holds in every scenario', () => {
    for (const sc of scenarios) checkCurrency(sc.id, 800);
  });
});
