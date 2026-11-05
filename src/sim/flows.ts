// Rate expressions for flows F1..F34, one function each, keyed by flow ID.
// Each takes the state, the params in force, and the tick's scratch context `x`,
// which carries intermediate quantities computed earlier in the tick order.
import type { Params } from './params';
import type { State, Channel } from './state';
import { aperture } from './params';

export interface Ctx {
  gate: number;
  requests: Record<Channel, number>;
  served: number;
  C_eff: number;
  C_infer: number;
  C_train_avail: number;
  training: boolean;
  trainStep: number;
  incidents: number;
  commonsIntake: number;
  sf: number;
  license: number;
  distill: number;
  funding: number;
  spend: Record<string, number>;
  landed: number;
  released: boolean;
}

export function newCtx(): Ctx {
  return {
    gate: 0, requests: { consumer: 0, enterprise: 0 }, served: 1,
    C_eff: 0, C_infer: 0, C_train_avail: 0, training: false, trainStep: 0,
    incidents: 0, commonsIntake: 0, sf: 0, license: 0, distill: 0, funding: 0,
    spend: {}, landed: 0, released: false,
  };
}

type RateFn = (s: State, p: Params, x: Ctx) => number;

const sumReq = (x: Ctx) => x.requests.consumer + x.requests.enterprise;

export const rates: Record<string, RateFn> = {
  // Human food supply plus licensed data. Declines as expression is routed through the model.
  F1: (_s, _p, x) => x.commonsIntake + x.license,
  // Synthetic contamination of the commons.
  F2: (s, p) => p.E2.leak_fraction * s.flows.F12,
  // Corpus delivered to digestion while training.
  F3: (s, p, x) => (x.training ? p.L1.corpus_turnover * (s.L1.corpus_human + s.L1.corpus_synthetic) : 0),
  // Compute purchased, landing after the purchase lag.
  F4: (s, p, x) => (p.L3.theta * x.landed / Math.max(1e-6, s.E5.electricity_price)) * aperture(p, 'S5'),
  F5: (_s, _p, x) => (x.training ? x.C_train_avail : 0),
  F6: (_s, _p, x) => x.C_infer,
  F7: (_s, _p, x) => x.trainStep,
  F8: (_s, _p, x) => sumReq(x),
  F9: (s) => s.flows.F8,
  F10: (s) => s.flows.F9 * (1 - s.L8.refusal_rate),
  F11: (s) => s.flows.F10,
  F12: (s, _p, x) => s.flows.F11 * x.served,
  F13: (s) => s.flows.F12,
  F14: (s, _p, x) =>
    (['consumer', 'enterprise'] as const).reduce(
      (acc, c) => acc + s.L4[c].price_per_token * x.requests[c] * (1 - s.L8.refusal_rate) * x.served * s.E1[c].willingness_to_pay, 0),
  F15: (_s, _p, x) => x.funding,
  F16: (_s, _p, x) => x.spend.compute ?? 0,
  F17: (_s, _p, x) => x.spend.data ?? 0,
  F18: (_s, _p, x) => x.spend.safety ?? 0,
  F19: (_s, _p, x) => x.spend.compliance ?? 0,
  F20: (_s, _p, x) => x.spend.staff ?? 0,
  F21: (s, p) => p.L6.sample_rate * s.flows.F12,
  F22: (s) => s.flows.F8,
  F23: (s) => s.L6.benchmark_score,
  F24: (s) => s.L6.w_usage,
  F25: (s) => Object.values(s.L7.allocation_vector).reduce((a, b) => a + b, 0),
  F26: (s) => s.M4.temperature,
  F27: (_s, _p, x) => (x.released ? 1 : 0),
  F28: (_s, _p, x) => x.distill,
  F29: (s, p) => s.E4.scrutiny * s.E4.rule_set * aperture(p, 'S4'),
  F30: (_s, _p, x) => x.incidents,
  F31: (s) => (s.L9.gate_open ? 1 : 0),
  F32: (s) => s.E6.best_rival_capability,
  F33: (s, p) => Math.max(0, s.E6.best_rival_capability - s.M1.capability) * p.E1.switching_rate * s.flows.F8,
  F34: (s) => s.flows.F5 + s.flows.F6,
};
