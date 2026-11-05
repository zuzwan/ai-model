// State of the organism. Every component's state variables, by component ID.
// Plain JSON-serialisable data so the record buffer can store and fork it.
import type { Params } from './params';
import { seedToState } from './rng';

export const CHANNELS = ['consumer', 'enterprise'] as const;
export type Channel = (typeof CHANNELS)[number];
export type PerChannel<T> = Record<Channel, T>;
export const ALLOC_KEYS = ['compute', 'data', 'safety', 'compliance', 'staff'] as const;
export type AllocKey = (typeof ALLOC_KEYS)[number];
export type Allocation = Record<AllocKey, number>;

export interface Generation { n: number; t: number; capability: number; benchmark: number; alignment_to_usage: number; alignment_to_usefulness: number }

export interface Weights { capability: number; alignment_to_usage: number; alignment_to_usefulness: number; contamination_load: number }

export interface State {
  t: number;
  rng: number;
  /** False once the loop is dead (insolvent with no capital). */
  alive: boolean;
  deprecations: number;

  // Environment
  E1: PerChannel<{ demand: number; satisfaction: number; dependence: number; willingness_to_pay: number }>;
  E2: { human_expression_rate: number; synthetic_fraction: number; accessibility: number; pool_human: number; pool_synthetic: number };
  E3: { capital_available: number; cost_of_capital: number; patience: number; impatience: number };
  E4: { scrutiny: number; rule_set: number; tolerance: number };
  E5: { electricity_price: number; availability: number; carbon_constraint: number };
  E6: { best_rival_capability: number; release_cadence: number; next_release: number };

  // Loop
  L1: { corpus_human: number; corpus_synthetic: number; intake_rate: number; license_cost: number };
  L2: { train_active: boolean; train_progress: number; corpus_quality: number; epochs: number; candidate: Weights };
  L3: { capacity: number; utilization: number; utilization_train: number; utilization_infer: number; depreciation_rate: number; energy_draw: number; pipeline: number[] };
  L4: PerChannel<{ request_rate: number; price_per_token: number }> & { latency: number; uptime: number; served: number };
  L5: { reserve: number; burn_rate: number; revenue_rate: number; funding_rate: number; runway: number };
  L6: { benchmark_score: number; reward_model_bias: number; eval_coverage: number; w_usage: number; w_usefulness: number; w_safety: number; usage_ema: number; usage_trend: number; w_anchor: number };
  L7: { allocation_vector: Allocation; price_multiplier: number; distill_throttle: number; deprecate_flag: boolean; release_flag: boolean; data_alarm_gen: number };
  L8: { filter_strength: number; refusal_rate: number; incident_count: number; incidents_today: number };
  L9: { legitimacy: number; decay_rate: number; incident_damage: number; gate_open: boolean };
  L10: { generations: Generation[]; active_generation: number; distill_queue: number; lineage_end: number | null };
  L11: { headcount: number; retention: number; know_how: number };

  // Model (technical object): holds state, produces and decides nothing
  M1: Weights & { age: number };
  M2: { tokens_per_second: number; energy_per_token: number; queue_depth: number };
  M3: { occupancy: number; retention: number };
  M4: { temperature: number; system_program: number; refusal_hooks: number };

  /** Rate of every flow F1..F34 during the last tick. */
  flows: Record<string, number>;
}

/** Core scalars the renderer binds to (brief: simulation rules, core state). */
export interface Core {
  W: number; A_u: number; A_v: number; G: number; X: number; U: number; V: number; R: number;
  C: number; H: number; Q: number; Lambda: number; D: number; Z: number;
  w_u: number; w_v: number; w_s: number; N: number; h: number;
  U_consumer: number; U_enterprise: number;
}

export function usefulness(s: State): number {
  return s.M1.capability * s.M1.alignment_to_usefulness * (1 - s.M1.contamination_load);
}

export function totalUsage(s: State): number {
  return s.L4.consumer.request_rate + s.L4.enterprise.request_rate;
}

export function meanDependence(s: State): number {
  const u = s.E1.consumer.demand + s.E1.enterprise.demand;
  if (u <= 0) return (s.E1.consumer.dependence + s.E1.enterprise.dependence) / 2;
  return (s.E1.consumer.dependence * s.E1.consumer.demand + s.E1.enterprise.dependence * s.E1.enterprise.demand) / u;
}

export function humanFraction(s: State): number {
  const tot = s.L1.corpus_human + s.L1.corpus_synthetic;
  return tot > 0 ? s.L1.corpus_human / tot : 0;
}

export function core(s: State): Core {
  return {
    W: s.M1.capability,
    A_u: s.M1.alignment_to_usage,
    A_v: s.M1.alignment_to_usefulness,
    G: s.M1.alignment_to_usage - s.M1.alignment_to_usefulness,
    X: s.M1.contamination_load,
    U: totalUsage(s),
    V: usefulness(s),
    R: s.L5.reserve,
    C: s.L3.capacity,
    H: humanFraction(s),
    Q: s.L2.corpus_quality,
    Lambda: s.L9.legitimacy,
    D: meanDependence(s),
    Z: s.E6.best_rival_capability,
    w_u: s.L6.w_usage, w_v: s.L6.w_usefulness, w_s: s.L6.w_safety,
    N: s.L10.active_generation,
    h: s.E2.human_expression_rate,
    U_consumer: s.L4.consumer.request_rate,
    U_enterprise: s.L4.enterprise.request_rate,
  };
}

export function init(p: Params, seed: number): State {
  const st = p.start;
  const weights: Weights = { capability: st.W, alignment_to_usage: st.A_u, alignment_to_usefulness: st.A_v, contamination_load: st.X };
  const human = st.corpus * st.H;
  const synth = st.corpus * (1 - st.H);
  const ch = (c: 'consumer' | 'enterprise') => ({
    demand: st.U[c],
    satisfaction: st.satisfaction,
    dependence: st.D,
    willingness_to_pay: p.E1.channels[c].wtp,
  });
  const s: State = {
    t: 0,
    rng: seedToState(seed),
    alive: true,
    deprecations: 0,
    E1: { consumer: ch('consumer'), enterprise: ch('enterprise') },
    E2: {
      human_expression_rate: p.E2.h0 * (1 - p.E2.kappa * st.D),
      synthetic_fraction: 1 - st.H,
      accessibility: p.E2.accessibility,
      pool_human: st.commons_pool * st.H,
      pool_synthetic: st.commons_pool * (1 - st.H),
    },
    E3: { capital_available: p.E3.capital_available, cost_of_capital: p.E3.cost_of_capital, patience: p.E3.patience, impatience: 0 },
    E4: { scrutiny: st.scrutiny, rule_set: st.rule_set, tolerance: p.E4.tolerance },
    E5: { electricity_price: p.E5.electricity_price, availability: p.E5.availability, carbon_constraint: p.E5.carbon_constraint },
    E6: { best_rival_capability: st.Z, release_cadence: p.E6.release_cadence, next_release: p.E6.release_cadence },
    L1: { corpus_human: human, corpus_synthetic: synth, intake_rate: 0, license_cost: p.L1.license_cost },
    L2: { train_active: true, train_progress: 0, corpus_quality: st.H ** p.L2.quality_exponent * (1 - st.X), epochs: 0, candidate: { ...weights } },
    L3: {
      capacity: st.C, utilization: 0, utilization_train: 0, utilization_infer: 0,
      depreciation_rate: p.L3.depreciation, energy_draw: 0,
      // Purchases already in flight, so capacity holds steady through the first lag window.
      pipeline: Array.from({ length: p.L3.purchase_lag }, () => p.L7.base.compute * p.L5.burn_scale),
    },
    L4: {
      consumer: { request_rate: st.U.consumer, price_per_token: p.L4.price.consumer },
      enterprise: { request_rate: st.U.enterprise, price_per_token: p.L4.price.enterprise },
      latency: 1, uptime: p.L4.uptime, served: 1,
    },
    L5: { reserve: st.R, burn_rate: 0, revenue_rate: 0, funding_rate: 0, runway: p.L5.runway_cap },
    L6: { benchmark_score: 0, reward_model_bias: p.L6.reward_model_bias, eval_coverage: p.L6.eval_coverage, w_usage: st.w.u, w_usefulness: st.w.v, w_safety: st.w.s, usage_ema: st.U.consumer + st.U.enterprise, usage_trend: 0, w_anchor: st.w.u },
    L7: { allocation_vector: { ...p.L7.base }, price_multiplier: 1, distill_throttle: 1, deprecate_flag: false, release_flag: false, data_alarm_gen: 0 },
    L8: { filter_strength: 0, refusal_rate: 0, incident_count: 0, incidents_today: 0 },
    L9: { legitimacy: st.Lambda, decay_rate: p.L9.decay_rate, incident_damage: 0, gate_open: true },
    L10: { generations: [], active_generation: st.N, distill_queue: 0, lineage_end: null },
    L11: { headcount: st.headcount, retention: 1, know_how: st.know_how },
    M1: { ...weights, age: 0 },
    M2: { tokens_per_second: 0, energy_per_token: p.L3.infer_cost, queue_depth: 0 },
    M3: { occupancy: 0, retention: 0 },
    M4: { temperature: st.temperature, system_program: 1, refusal_hooks: 0 },
    flows: {},
  };
  s.L6.benchmark_score = benchmark(s.M1, s.L6.eval_coverage);
  s.L10.generations.push({ n: st.N, t: 0, capability: st.W, benchmark: s.L6.benchmark_score, alignment_to_usage: st.A_u, alignment_to_usefulness: st.A_v });
  return s;
}

/** What evaluation can see of a set of weights: capability times the covered part of alignment. */
export function benchmark(w: Weights, coverage: number): number {
  return w.capability * (coverage * w.alignment_to_usefulness + (1 - coverage) * w.alignment_to_usage) * (1 - w.contamination_load);
}
