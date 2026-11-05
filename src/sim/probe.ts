// Named quantities for scenario expectations and sweeps.
// A var is a name ("W", "F5", "alloc.staff") or an aggregate "min(name,t0,t1)" / "max(...)" / "mean(...)".
// An expectation's value is a number or a reference "name@t" (optionally "name@t+0.05").
import { core, type State } from './state';
import type { Expectation } from './scenario';

export function probe(s: State, name: string): number {
  const c = core(s) as unknown as Record<string, number>;
  if (name in c) return c[name];
  if (/^F\d+$/.test(name)) return s.flows[name] ?? 0;
  if (name.startsWith('alloc.')) return s.L7.allocation_vector[name.slice(6) as keyof typeof s.L7.allocation_vector];
  switch (name) {
    case 'alive': return s.alive ? 1 : 0;
    case 'deprecations': return s.deprecations;
    case 'deprecated': return s.L7.deprecate_flag ? 1 : 0;
    case 'incident_count': return s.L8.incident_count;
    case 'know_how': return s.L11.know_how;
    case 'spread': return s.L4.consumer.request_rate - s.L4.enterprise.request_rate;
    case 'closed_while_capable': return !s.L9.gate_open && s.M1.capability > 0.5 && core(s).U === 0 ? 1 : 0;
    case 'gate': return s.L9.gate_open ? 1 : 0;
    case 'scrutiny': return s.E4.scrutiny;
    case 'runway': return s.L5.runway;
    case 'price': return s.L7.price_multiplier;
    case 'S2': return s.E2.accessibility;
  }
  throw new Error(`unknown probe ${name}`);
}

const AGG = /^(min|max|mean)\(([\w.]+),\s*(\d+),\s*(\d+)\)$/;

export function evalVar(states: State[], expr: string, at: number): number {
  const m = expr.match(AGG);
  if (!m) return probe(states[Math.min(at, states.length - 1)], expr);
  const [, agg, name, a, b] = m;
  const xs = states.slice(Number(a), Number(b) + 1).map((s) => probe(s, name));
  if (agg === 'min') return Math.min(...xs);
  if (agg === 'max') return Math.max(...xs);
  return xs.reduce((p, q) => p + q, 0) / xs.length;
}

export function evalValue(states: State[], v: number | string): number {
  if (typeof v === 'number') return v;
  const m = v.match(/^([\w.()]+(?:,\s*\d+,\s*\d+\))?)@(\d+)([+-][\d.]+)?$/);
  if (!m) throw new Error(`bad reference ${v}`);
  return evalVar(states, m[1], Number(m[2])) + (m[3] ? Number(m[3]) : 0);
}

export interface Verdict { e: Expectation; actual: number; target: number; pass: boolean }

export function check(states: State[], e: Expectation): Verdict {
  const actual = evalVar(states, e.var, e.at);
  const target = evalValue(states, e.value as number | string);
  const tol = e.tol ?? 0;
  const pass =
    e.op === '<' ? actual < target + tol :
    e.op === '>' ? actual > target - tol :
    e.op === '<=' ? actual <= target + tol :
    e.op === '>=' ? actual >= target - tol :
    Math.abs(actual - target) <= tol;
  return { e, actual, target, pass };
}

export function horizon(exp: Expectation[]): number {
  let n = 0;
  for (const e of exp) {
    n = Math.max(n, e.at);
    const m = e.var.match(AGG);
    if (m) n = Math.max(n, Number(m[4]));
    if (typeof e.value === 'string') n = Math.max(n, Number(e.value.split('@')[1].replace(/[+-].*/, '')));
  }
  return n;
}
