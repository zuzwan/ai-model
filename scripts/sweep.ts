// Parameter sweep: for each pathology, perturb every coefficient by +/-20% and report
// which ones move the pathology's expectation margins most, and which ones break it.
// Usage: npm run sweep [-- scenarioId] > docs/sensitivity.md
import { scenarios, scenarioParams } from '../src/sim/scenario';
import { init } from '../src/sim/state';
import { run } from '../src/sim/tick';
import { check, horizon } from '../src/sim/probe';
import { defaultParams, getPath, setPath, clone, type Params } from '../src/sim/params';

const SKIP = /^(start\.|valves|apertures|schedules|L7\.(base|floor|ceiling)\.|L4\.uptime|E5\.availability|L1\.license_enabled|L2\.distillation)/;
const DELTA = 0.2;

function leaves(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'number') return [prefix];
  if (obj && typeof obj === 'object' && !Array.isArray(obj))
    return Object.entries(obj).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  return [];
}

function margin(states: ReturnType<typeof run>, sc: (typeof scenarios)[number]) {
  let sum = 0;
  let fails = 0;
  for (const e of sc.expect) {
    const v = check(states, e);
    const scale = Math.max(0.05, Math.abs(v.target));
    const m = e.op === '<' || e.op === '<=' ? v.target - v.actual : e.op === '==' ? -Math.abs(v.actual - v.target) : v.actual - v.target;
    sum += Math.max(-1, Math.min(1, m / scale));
    if (!v.pass) fails++;
  }
  return { score: sum / sc.expect.length, fails };
}

const only = process.argv[2];
const keys = leaves(defaultParams).filter((k) => !SKIP.test(k));
const out: string[] = ['# Pathology sensitivity', '', `Each coefficient perturbed by ±${DELTA * 100}% around its value in the preset. Score is the mean normalised margin of the preset's expectations; elasticity is the change in score per unit relative change. "Breaks" lists perturbations under which an expectation fails.`, ''];

for (const sc of scenarios) {
  if (only && sc.id !== only) continue;
  const base = scenarioParams(sc);
  const n = horizon(sc.expect);
  const ref = margin(run(init(base, sc.seed), base, n), sc);
  const rows: { k: string; el: number; breaks: string[] }[] = [];
  for (const k of keys) {
    const v0 = getPath(base, k) as number;
    if (v0 === 0) continue;
    const res: Record<string, ReturnType<typeof margin>> = {};
    for (const sign of [-1, 1]) {
      const p: Params = clone(base);
      const v = v0 * (1 + sign * DELTA);
      setPath(p, k, Number.isInteger(v0) && Math.abs(v0) >= 2 ? Math.round(v) : v);
      res[sign] = margin(run(init(p, sc.seed), p, n), sc);
    }
    const el = (res[1].score - res[-1].score) / (2 * DELTA);
    const breaks = [-1, 1].filter((s) => res[s].fails > ref.fails).map((s) => (s > 0 ? '+' : '−'));
    rows.push({ k, el, breaks });
  }
  rows.sort((a, b) => Math.abs(b.el) - Math.abs(a.el));
  out.push(`## ${sc.name} (\`${sc.id}\`, ${n} ticks, baseline score ${ref.score.toFixed(3)}, failing ${ref.fails})`, '');
  out.push('| coefficient | elasticity | breaks at |', '|---|---:|---|');
  for (const r of rows.slice(0, 8)) out.push(`| \`${r.k}\` | ${r.el.toFixed(3)} | ${r.breaks.join(' ') || ''} |`);
  const fragile = rows.filter((r) => r.breaks.length && !rows.slice(0, 8).includes(r));
  if (fragile.length) out.push('', `Also breaks under ±20%: ${fragile.map((r) => `\`${r.k}\` (${r.breaks.join('')})`).join(', ')}.`);
  out.push('');
  console.error(`swept ${sc.id}`);
}
console.log(out.join('\n'));
