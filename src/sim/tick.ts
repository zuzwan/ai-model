// One tick (one day) of the organism, in the order given by the brief:
// 1 environment, 2 perturbation channel, 3 currency inflows, 4 decision chain,
// 5 currency outflows, 6 compute landing and training, 7 waste and heat,
// 8 legitimacy, 9 deprecation check. Pure: (state, params) -> new state.
import { type Params, paramsAt, valve, aperture } from './params';
import { type State, CHANNELS, ALLOC_KEYS, usefulness, meanDependence, humanFraction, benchmark, totalUsage } from './state';
import { rates, newCtx, type Ctx } from './flows';
import { flowById } from './ontology';
import { decide } from './policy';
import { Rng } from './rng';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

const SPEND_FLOW: Record<string, string> = { compute: 'F16', data: 'F17', safety: 'F18', compliance: 'F19', staff: 'F20' };

export function tick(prev: State, params: Params): State {
  const s: State = structuredClone(prev);
  const p = paramsAt(params, prev.t);
  const rng = new Rng(s.rng);
  const x: Ctx = newCtx();
  const lastFlows = prev.flows;
  s.flows = {};
  /** Evaluate a flow's rate, apply its valve, record it, and return it. */
  const flow = (id: string): number => {
    const raw = s.alive ? rates[id](s, p, x) : 0;
    const v = Math.max(0, raw) * (flowById.get(id)!.valveable ? valve(p, id) : 1);
    s.flows[id] = v;
    return v;
  };
  if (!s.alive) {
    s.t += 1;
    for (const id of flowById.keys()) s.flows[id] = 0;
    s.rng = rng.state;
    return s;
  }

  // ---- 1. Environment compartments ------------------------------------------------
  const W = s.M1.capability;
  const Z0 = s.E6.best_rival_capability;
  const U_prev = totalUsage(prev);

  // E3 capital cycle
  s.E3.capital_available = p.E3.capital_available * (1 + p.E3.cycle_amplitude * Math.sin((2 * Math.PI * s.t) / p.E3.cycle_period));
  s.E3.cost_of_capital = p.E3.cost_of_capital;
  s.E3.patience = p.E3.patience;

  // E5 grid
  s.E5.availability = p.E5.availability;
  s.E5.carbon_constraint = p.E5.carbon_constraint;
  s.E5.electricity_price = p.E5.electricity_price * (1 + p.E5.price_demand * (s.L3.capacity - 1) + p.E5.carbon_constraint);

  // E6 rivals grow on their own schedule and jump on release events
  let Z = Z0 + p.E6.growth_rate * (p.E6.ceiling - Z0);
  if (s.t >= s.E6.next_release) {
    Z += p.E6.release_jump * Math.max(0, p.E6.ceiling - Z) + p.E6.release_jitter * rng.normal();
    s.E6.next_release += p.E6.release_cadence;
  }
  s.E6.best_rival_capability = clamp01(Z);
  s.E6.release_cadence = p.E6.release_cadence;

  // E4 scrutiny follows incidents and usage scale; rule set ratchets
  const scrTarget = p.E4.scrutiny_base * (1 + p.E4.incident_sensitivity * s.L8.incident_count + p.E4.usage_sensitivity * (U_prev - 1));
  s.E4.scrutiny = Math.max(0, s.E4.scrutiny + p.E4.scrutiny_rate * (scrTarget - s.E4.scrutiny));
  s.E4.rule_set += p.E4.rule_ratchet * Math.max(0, s.E4.scrutiny - p.E4.tolerance);
  s.E4.tolerance = p.E4.tolerance;

  // E2 commons: human expression falls with dependence; synthetic share follows model waste
  const D = meanDependence(s);
  s.E2.human_expression_rate = p.E2.h0 * Math.max(0, 1 - p.E2.kappa * D);
  s.E2.pool_human += s.E2.human_expression_rate - p.E2.turnover * s.E2.pool_human;
  s.E2.pool_synthetic += (lastFlows.F2 ?? 0) - p.E2.turnover * s.E2.pool_synthetic;
  const pool = s.E2.pool_human + s.E2.pool_synthetic;
  s.E2.synthetic_fraction = pool > 0 ? s.E2.pool_synthetic / pool : 0;
  s.E2.accessibility = clamp01(p.E2.accessibility * (1 - p.E2.accessibility_scrutiny * Math.max(0, s.E4.scrutiny - 1)));

  // E1 users: dependence, satisfaction, willingness to pay, demand
  const V = usefulness(s);
  for (const c of CHANNELS) {
    const ch = p.E1.channels[c];
    const u = s.E1[c];
    const Uc = prev.L4[c].request_rate;
    u.dependence = clamp01(u.dependence + p.E1.delta * ch.dep_weight * Uc * (1 - u.dependence) - p.E1.rho * u.dependence);
    const satTarget = (ch.alpha * V + ch.beta * s.M1.alignment_to_usage) / (ch.alpha + ch.beta) * prev.L4.served;
    u.satisfaction += p.E1.satisfaction_rate * (satTarget - u.satisfaction);
    u.willingness_to_pay = ch.wtp * (1 + p.E1.wtp_dependence * (u.dependence - p.E1.ref_D));
    // Dependence lowers sensitivity to usefulness.
    const bracket = 1
      + ch.alpha * (1 - u.dependence) * (V - p.E1.ref_V)
      + ch.beta * (s.M1.alignment_to_usage - p.E1.ref_Au)
      + ch.gamma * (u.dependence - p.E1.ref_D)
      - p.E1.sigma * p.E1.switching_rate * Math.max(0, s.E6.best_rival_capability - W)
      - p.E1.latency_penalty * (1 - prev.L4.served)
      - p.E1.price_elasticity * (s.L7.price_multiplier - 1);
    const target = Math.max(0, ch.base * bracket);
    u.demand = Math.max(0, u.demand + p.E1.demand_rate * (target - u.demand)) * (1 + p.E1.noise * rng.normal());
  }

  // ---- 2. Perturbation channel (F8..F13, F21) -------------------------------------
  x.gate = s.L9.gate_open && !s.L7.deprecate_flag ? 1 : 0;
  CHANNELS.forEach((c, i) => {
    x.requests[c] = s.E1[c].demand * x.gate * s.L4.uptime * aperture(p, 'S1', i) * valve(p, 'F8');
  });
  const fShare = (k: number) => k / (k + p.L8.filter_k);
  s.L8.filter_strength = fShare(prev.flows.F18 ?? p.L7.base.safety * p.L5.burn_scale);
  s.L8.refusal_rate = clamp01(p.L8.refusal_base * s.L8.filter_strength / fShare(p.L7.base.safety * p.L5.burn_scale));
  // The F8 valve is folded into each channel's requests above, so record the sum directly.
  s.flows.F8 = x.requests.consumer + x.requests.enterprise;
  flow('F9');
  flow('F10');
  flow('F11');
  s.M3.occupancy = s.flows.F11;
  s.M3.retention = 0;
  x.C_eff = s.L3.capacity * s.E5.availability;
  const inferNeed = s.flows.F11 * p.L3.infer_cost;
  x.C_infer = Math.min(inferNeed, x.C_eff);
  flow('F6');
  x.served = inferNeed > 0 ? s.flows.F6 / inferNeed : 1;
  x.served = clamp01(x.served);
  flow('F12');
  flow('F13');
  flow('F21');
  for (const c of CHANNELS) s.L4[c].request_rate = x.requests[c];
  s.L4.served = x.served;
  s.L4.latency = 1 / Math.max(0.05, x.served);
  s.M2.tokens_per_second = s.flows.F12;
  s.M2.queue_depth = Math.max(0, s.flows.F11 - s.flows.F12);
  s.M2.energy_per_token = p.L3.infer_cost;
  // Incidents arise from served outputs that pass a weak filter, scaled by temperature.
  const incRate = p.L8.incident_base * p.L8.incident_multiplier * s.flows.F12 * 2 * (1 - s.L8.filter_strength) * s.M4.temperature;
  x.incidents = rng.poisson(incRate);
  s.L8.incidents_today = x.incidents;

  // ---- 3. Currency inflows (F14, F15) ---------------------------------------------
  for (const c of CHANNELS) s.L4[c].price_per_token = p.L4.price[c] * s.L7.price_multiplier;
  const U = totalUsage(s);
  s.L6.usage_ema += 0.05 * (U - s.L6.usage_ema);
  s.L6.usage_trend += 0.05 * ((U_prev > 0 ? (U - U_prev) / U_prev : 0) - s.L6.usage_trend);
  const growth = s.L6.usage_trend;
  const prevNetBurn = (prev.L5.burn_rate) - (prev.L5.revenue_rate + prev.L5.funding_rate);
  const prevRunway = prevNetBurn > 0 ? prev.L5.reserve / prevNetBurn : p.L5.runway_cap;
  if (prevRunway < p.L5.runway_cutoff && growth <= 0) s.E3.impatience += 1;
  else s.E3.impatience = Math.max(0, s.E3.impatience - 1);
  const patienceOK = s.E3.impatience < p.E3.patience ? 1 : 0;
  const appeal = clamp(1 + p.E3.capability_weight * (W - s.E6.best_rival_capability) + p.E3.growth_weight * growth * 100, 0, 2)
    * Math.min(1, s.L9.legitimacy / p.E3.legitimacy_floor);
  x.funding = Math.max(0, s.E3.capital_available) * appeal * patienceOK * aperture(p, 'S3');
  const revenue = flow('F14');
  const funding = flow('F15');
  s.L5.reserve += revenue + funding;
  s.L5.revenue_rate = revenue;
  s.L5.funding_rate = funding;

  // ---- 4. Decision chain reads signals (F22, F23, F29, F30, F32) and allocates -----
  flow('F22');
  flow('F23');
  flow('F29');
  flow('F32');
  const plannedBurn = ALLOC_KEYS.reduce((acc, k) => acc + s.L7.allocation_vector[k], 0) * p.L5.burn_scale;
  const netBurn = plannedBurn - (revenue + funding);
  const runway = netBurn > 0 ? s.L5.reserve / netBurn : p.L5.runway_cap;
  s.L5.runway = Math.min(runway, p.L5.runway_cap);
  const trainStarved = x.C_eff - x.C_infer < p.L2.C_min;
  decide(s, p, { latency: s.L4.latency, runway: s.L5.runway, netBurn, legitimacy: s.L9.legitimacy, trainStarved });
  flow('F25');
  flow('F26');

  // ---- 5. Currency outflows (F16..F20) -------------------------------------------
  const want: Record<string, number> = {};
  let wantTotal = 0;
  for (const k of ALLOC_KEYS) {
    want[k] = s.L7.allocation_vector[k] * p.L5.burn_scale * valve(p, SPEND_FLOW[k]);
    wantTotal += want[k];
  }
  const scale = wantTotal > s.L5.reserve ? s.L5.reserve / wantTotal : 1;
  for (const k of ALLOC_KEYS) x.spend[k] = want[k] * scale;
  let spent = 0;
  for (const k of ALLOC_KEYS) {
    // Valves were applied in `want`; record without applying again.
    s.flows[SPEND_FLOW[k]] = x.spend[k];
    spent += x.spend[k];
  }
  s.L5.reserve = Math.max(0, s.L5.reserve - spent);
  s.L5.burn_rate = spent;

  // Staff and tacit know-how: headcount follows payroll; know-how rises slowly and falls fast.
  const staffBase = p.L7.base.staff * p.L5.burn_scale;
  const hcTarget = x.spend.staff / staffBase;
  s.L11.headcount += p.L11.hire_rate * (hcTarget - s.L11.headcount);
  s.L11.retention = clamp01(hcTarget);
  const khRate = s.L11.headcount > s.L11.know_how ? p.L11.learn_rate : p.L11.loss_rate;
  s.L11.know_how = Math.max(0, s.L11.know_how + khRate * (s.L11.headcount - s.L11.know_how));

  // ---- 6. Compute purchase lands (F4); training step (F3, F5, F7, F28) -------------
  s.L3.pipeline.push(x.spend.compute);
  x.landed = s.L3.pipeline.shift() ?? 0;
  const F4 = flow('F4');
  s.L3.capacity = Math.max(0, s.L3.capacity * (1 - p.L3.depreciation) + F4);
  s.L3.depreciation_rate = p.L3.depreciation;
  x.C_train_avail = Math.max(0, x.C_eff - x.C_infer);
  const pipelineOK = s.L11.know_how >= p.L2.know_how_floor;
  x.training = s.L2.train_active && x.C_train_avail >= p.L2.C_min && pipelineOK;

  // Food: commons intake (human and synthetic, by the commons mix) plus licensed human data.
  const intakeBase = p.E2.intake_capture * s.E2.accessibility * aperture(p, 'S2') * (s.E2.human_expression_rate + (lastFlows.F2 ?? 0));
  x.commonsIntake = intakeBase;
  x.license = p.L1.license_enabled * x.spend.data / Math.max(1e-6, p.L1.license_cost);
  x.sf = s.E2.synthetic_fraction;
  const F1 = flow('F1');
  const f1Scale = x.commonsIntake + x.license > 0 ? F1 / (x.commonsIntake + x.license) : 0;
  const humanIn = (x.commonsIntake * (1 - x.sf) + x.license) * f1Scale;
  const synthIn = x.commonsIntake * x.sf * f1Scale;
  // Distillation: training on prior generation outputs; the samples join the corpus as synthetic.
  x.distill = x.training && s.L10.generations.length >= 2 ? p.L2.distillation * p.L2.distill_rate * s.L7.distill_throttle : 0;
  const F28 = flow('F28');
  s.L10.distill_queue = F28;
  const turn = p.L1.corpus_turnover;
  s.L1.corpus_human = Math.max(0, s.L1.corpus_human + humanIn - turn * s.L1.corpus_human);
  s.L1.corpus_synthetic = Math.max(0, s.L1.corpus_synthetic + synthIn + F28 - turn * s.L1.corpus_synthetic);
  s.L1.intake_rate = F1;
  s.L1.license_cost = p.L1.license_cost;
  const H = humanFraction(s);
  flow('F3');
  const cand = s.L2.candidate;
  s.L2.corpus_quality = H ** p.L2.quality_exponent * (1 - cand.contamination_load);
  const Q = s.L2.corpus_quality;
  const F5 = flow('F5');
  if (x.training) {
    const kh = Math.min(1, s.L11.know_how / p.L2.know_how_ref);
    const k = p.L2.g * F5 * kh;
    const kA = p.L2.g_align * F5 * kh;
    x.trainStep = k;
    // Capability grows with corpus quality and erodes on poor food.
    cand.capability = clamp01(cand.capability + k * (Q * (1 - cand.capability) - p.L2.phi * (1 - Q) * cand.capability));
    // Alignment relaxes toward targets set by the objective weights. The loop can only train
    // toward the part of usefulness its evaluations see, so w_usefulness counts at eps / eps_ref.
    const wu = s.L6.w_usage;
    const wvEff = s.L6.w_usefulness * s.L6.eval_coverage / p.L2.eval_coverage_ref;
    const Tu = clamp01(p.L2.alignment_neutral + p.L2.alignment_gain * (wu - wvEff));
    const Tv = clamp01(p.L2.alignment_neutral + p.L2.alignment_gain * (wvEff - wu));
    cand.alignment_to_usage = clamp01(cand.alignment_to_usage + kA * (Tu - cand.alignment_to_usage));
    cand.alignment_to_usefulness = clamp01(cand.alignment_to_usefulness + kA * (Tv - cand.alignment_to_usefulness));
    s.L2.train_progress += 1 / p.L2.generation_length;
    s.L2.epochs += 1 / p.L2.generation_length;
  }
  cand.contamination_load = clamp01(cand.contamination_load + p.L2.chi * F28 - p.L2.mu * H * cand.contamination_load);
  s.L7.release_flag = false;
  if (s.L2.train_progress >= 1) {
    // Release: L7 decides, the checkpoint lands in M1 via F7 and in the archive via F27.
    s.L2.train_progress = 0;
    s.L7.release_flag = true;
    x.released = true;
    s.M1.capability = cand.capability;
    s.M1.alignment_to_usage = cand.alignment_to_usage;
    s.M1.alignment_to_usefulness = cand.alignment_to_usefulness;
    s.M1.contamination_load = cand.contamination_load;
    s.M1.age = 0;
    s.L10.active_generation += 1;
    s.L6.benchmark_score = benchmark(s.M1, s.L6.eval_coverage);
    s.L10.generations.push({
      n: s.L10.active_generation, t: s.t + 1, capability: s.M1.capability, benchmark: s.L6.benchmark_score,
      alignment_to_usage: s.M1.alignment_to_usage, alignment_to_usefulness: s.M1.alignment_to_usefulness,
    });
  } else {
    s.M1.age += 1;
  }
  flow('F7');
  flow('F27');
  flow('F24');
  s.L3.utilization_infer = x.C_eff > 0 ? x.C_infer / Math.max(1e-6, s.L3.capacity) : 0;
  s.L3.utilization_train = x.training ? F5 / Math.max(1e-6, s.L3.capacity) : 0;
  s.L3.utilization = s.L3.utilization_infer + s.L3.utilization_train;

  // L6 objective drift (the want): selection pushes w_usage toward what raises usage.
  const dUdAu = CHANNELS.reduce((acc, c) => acc + s.E1[c].demand * p.E1.channels[c].beta, 0);
  const wu0 = p.start.w.u;
  s.L6.w_usage = clamp(
    s.L6.w_usage + p.L6.eta * dUdAu * (1 - s.L6.w_safety) - p.L6.objective_anchor * (s.L6.w_usage - wu0),
    0, 1 - s.L6.w_safety);
  s.L6.w_usefulness = Math.max(0, 1 - s.L6.w_usage - s.L6.w_safety);
  s.L6.eval_coverage = p.L6.eval_coverage;
  s.L6.reward_model_bias = s.L6.w_usage - wu0;

  // ---- 7. Waste and heat (F2, F34), and other display flows -------------------------
  flow('F2');
  flow('F34');
  s.L3.energy_draw = s.flows.F34;
  flow('F33');

  // ---- 8. Legitimacy decay and recovery ---------------------------------------------
  s.L8.incident_count += p.L8.incident_memory * (x.incidents - s.L8.incident_count);
  flow('F30');
  const dmg = p.L9.nu * x.incidents;
  s.L9.incident_damage = dmg;
  s.L9.decay_rate = p.L9.decay_rate;
  s.L9.legitimacy = clamp01(
    s.L9.legitimacy - dmg - p.L9.xi * s.flows.F29 * totalUsage(s) - p.L9.decay_rate * s.L9.legitimacy + p.L9.tau * x.spend.compliance);
  if (s.L9.legitimacy < p.L9.Lambda_min) s.L9.gate_open = false;
  else if (!s.L9.gate_open && s.L9.legitimacy >= p.L7.legitimacy_reopen) s.L9.gate_open = true;
  flow('F31');

  // ---- 9. Deprecation check (a decision in L7, never a state of M1) -----------------
  const margin = s.E6.best_rival_capability - s.M1.capability;
  const bad = margin > p.L7.deprecation_margin || s.L9.legitimacy < p.L9.Lambda_min || s.L5.reserve <= 0;
  if (!s.L7.deprecate_flag && bad) {
    s.L7.deprecate_flag = true;
    s.deprecations += 1;
    s.L10.lineage_end = s.L10.active_generation;
  } else if (s.L7.deprecate_flag && x.released && !bad && s.L9.legitimacy >= p.L7.legitimacy_reopen) {
    s.L7.deprecate_flag = false;
    s.L10.lineage_end = null;
  }
  // Death: reserve exhausted and capital will not come. The loop stops; nothing is served.
  if (s.L5.reserve <= 0 && funding <= 0) {
    s.alive = false;
    for (const c of CHANNELS) s.L4[c].request_rate = 0;
    s.L9.gate_open = false;
  }

  s.t += 1;
  s.rng = rng.state;
  return s;
}

/** Run n ticks headless and return every state, including the initial one. */
export function run(s0: State, p: Params, n: number): State[] {
  const out = [s0];
  let s = s0;
  for (let i = 0; i < n; i++) { s = tick(s, p); out.push(s); }
  return out;
}
