# Pathology sensitivity

Each coefficient perturbed by ±20% around its value in the preset. Score is the mean normalised margin of the preset's expectations; elasticity is the change in score per unit relative change. "Breaks" lists perturbations under which an expectation fails.

## Baseline (`baseline`, 1500 ticks, baseline score 0.280, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L6.eval_coverage` | 0.831 | − |
| `E6.ceiling` | -0.765 | + |
| `L2.eval_coverage_ref` | -0.757 | + |
| `L5.burn_scale` | -0.740 | + |
| `L7.latency_threshold` | 0.696 | − |
| `E1.channels.consumer.base` | -0.327 |  |
| `L9.tau` | 0.270 |  |
| `E4.scrutiny_base` | -0.266 |  |

## Model collapse (`collapse`, 480 ticks, baseline score 0.421, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L7.latency_threshold` | 0.308 | − |
| `L2.generation_length` | 0.163 |  |
| `E2.h0` | -0.093 | + |
| `L2.distill_rate` | 0.058 | − |
| `E2.intake_capture` | -0.049 | + |
| `E2.leak_fraction` | 0.045 | − |
| `E2.accessibility` | -0.041 |  |
| `L2.g` | 0.033 |  |

Also breaks under ±20%: `L2.alignment_neutral` (−).

## Dependence trap (`dependence`, 420 ticks, baseline score 0.247, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L7.latency_threshold` | 0.443 | − |
| `E2.kappa` | 0.316 | − |
| `E1.channels.consumer.base` | 0.294 | − |
| `E1.delta` | 0.162 |  |
| `E1.rho` | -0.155 |  |
| `E2.h0` | 0.134 |  |
| `E6.ceiling` | -0.128 | + |
| `E1.channels.enterprise.base` | 0.118 |  |

Also breaks under ±20%: `E2.leak_fraction` (−).

## Engagement drift (`drift`, 420 ticks, baseline score 0.459, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `E1.channels.consumer.base` | 0.975 | − |
| `L7.latency_threshold` | 0.627 | − |
| `E1.channels.consumer.beta` | 0.496 |  |
| `L2.alignment_gain` | 0.384 |  |
| `L6.eta` | 0.374 |  |
| `L6.objective_anchor` | -0.359 |  |
| `E1.channels.enterprise.base` | -0.255 | − |
| `E1.ref_Au` | -0.216 |  |

Also breaks under ±20%: `E6.ceiling` (+).

## Legitimacy loss (`legitimacy`, 600 ticks, baseline score 0.006, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L9.Lambda_min` | -0.348 | + |
| `L5.burn_scale` | -0.244 | + |
| `L7.latency_threshold` | 0.109 | − |
| `L7.legitimacy_alarm` | 0.059 |  |
| `E6.release_cadence` | -0.056 |  |
| `L9.tau` | -0.053 |  |
| `E6.ceiling` | 0.050 |  |
| `E4.incident_sensitivity` | 0.049 |  |

## Compute starvation (`starvation`, 420 ticks, baseline score 0.124, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L3.infer_cost` | 0.907 | − |
| `E5.electricity_price` | 0.854 | − |
| `L3.theta` | -0.846 | + |
| `L3.depreciation` | 0.841 | − |
| `L2.C_min` | 0.832 | − |
| `E1.channels.enterprise.base` | 0.626 | − |
| `L7.latency_threshold` | 0.597 | − |
| `E6.ceiling` | 0.397 |  |

Also breaks under ±20%: `E1.channels.consumer.base` (−), `L5.burn_scale` (+).

## Capital withdrawal (`withdrawal`, 900 ticks, baseline score 0.185, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L5.burn_scale` | 1.417 | − + |
| `L7.latency_threshold` | 0.942 | − |
| `E1.channels.consumer.base` | -0.527 | − + |
| `E1.channels.enterprise.base` | -0.324 | − + |
| `E1.channels.consumer.wtp` | -0.215 | − |
| `L4.price.consumer` | -0.215 | − |
| `L9.tau` | 0.178 | − |
| `E1.channels.enterprise.wtp` | -0.160 | − |

Also breaks under ±20%: `L4.price.enterprise` (−), `E6.ceiling` (+), `E3.capital_available` (−), `E1.ref_Au` (+), `E6.growth_rate` (+), `L2.g` (−), `L5.runway_cutoff` (+), `E1.ref_D` (+), `L2.alignment_neutral` (−), `E1.ref_V` (+).

