// L7 decision chain: a deliberately crude allocation policy that reads only loop-visible signals.
// It never reads usefulness V, the gap G, or dependence D.
import type { Params } from './params';
import { ALLOC_KEYS, type AllocKey, type State } from './state';

export interface Signals {
  latency: number;
  runway: number;
  netBurn: number;
  legitimacy: number;
  trainStarved: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function decide(s: State, p: Params, sig: Signals): void {
  const P = p.L7;
  const a = s.L7.allocation_vector;
  const raised = new Set<AllocKey>();
  const raise = (k: AllocKey, by = P.step) => { a[k] = Math.min(P.ceiling[k], a[k] + by); raised.add(k); };
  let priceUp = false;
  let tempDown = false;

  // Energy: latency or a starved training draw shifts allocation to compute and raises price.
  if (sig.latency > P.latency_threshold || sig.trainStarved) {
    raise('compute');
    priceUp = true;
  }

  // Food: benchmark falling across two generations raises licensing and throttles distillation.
  const g = s.L10.generations;
  if (g.length >= 3 && s.L7.data_alarm_gen !== s.L10.active_generation) {
    const [b0, b1, b2] = g.slice(-3).map((x) => x.benchmark);
    if (b2 < b1 && b1 < b0) {
      s.L7.data_alarm_gen = s.L10.active_generation;
      s.L7.distill_throttle *= P.distill_throttle;
    }
  }
  if (s.L7.data_alarm_gen > 0 && s.L7.data_alarm_gen === s.L10.active_generation) raise('data');

  // Legitimacy: raise compliance and safety, lower temperature.
  if (sig.legitimacy < P.legitimacy_alarm) {
    raise('compliance');
    raise('safety');
    tempDown = true;
  }

  // Currency: when runway falls below the cutoff, cut staff and safety first, then the rest.
  if (sig.netBurn > 0 && sig.runway < p.L5.runway_cutoff) {
    priceUp = true;
    const first: AllocKey[] = ['staff', 'safety'];
    const firstAtFloor = first.every((k) => a[k] <= P.floor[k] + 1e-9);
    const cut = firstAtFloor ? ALLOC_KEYS.filter((k) => !first.includes(k)) : first;
    for (const k of cut) {
      a[k] = Math.max(P.floor[k], a[k] * (1 - P.cut_rate));
      raised.add(k); // a cut line does not relax back this tick
    }
  }

  // Lines not acted on this tick relax toward their base.
  for (const k of ALLOC_KEYS) if (!raised.has(k)) a[k] += (P.base[k] - a[k]) * P.relax;

  s.L7.price_multiplier = priceUp
    ? Math.min(P.price_max, s.L7.price_multiplier + P.price_step)
    : 1 + (s.L7.price_multiplier - 1) * (1 - P.relax);

  // Program applied to the technical object (F26).
  const t0 = p.start.temperature;
  s.M4.temperature = tempDown
    ? Math.max(P.temperature_min, s.M4.temperature - P.temperature_step)
    : clamp(s.M4.temperature + (t0 - s.M4.temperature) * P.relax, P.temperature_min, t0);
}
