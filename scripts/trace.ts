// Headless trajectory printer: npx vite-node scripts/trace.ts [scenario] [ticks] [every]
import { loadScenario } from '../src/sim/scenario';
import { run } from '../src/sim/tick';
import { core } from '../src/sim/state';

const [id = 'baseline', n = '1500', every = '60'] = process.argv.slice(2);
const { state, params } = loadScenario(id);
const states = run(state, params, Number(n));
const cols = ['W', 'A_u', 'A_v', 'G', 'X', 'U', 'U_consumer', 'U_enterprise', 'V', 'R', 'C', 'H', 'Q', 'Lambda', 'D', 'Z', 'w_u', 'N', 'h'] as const;
console.log(['t', ...cols, 'alive', 'dep'].map((c) => c.padStart(7)).join(''));
for (const s of states) {
  if (s.t % Number(every) !== 0) continue;
  const c = core(s);
  console.log([String(s.t).padStart(7), ...cols.map((k) => c[k].toFixed(3).padStart(7)), String(+s.alive).padStart(7), String(s.deprecations).padStart(7)].join(''));
}
