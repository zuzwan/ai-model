# Pathology sensitivity

Each coefficient perturbed by ±20% around its value in the preset. Score is the mean normalised margin of the preset's expectations; elasticity is the change in score per unit relative change. "Breaks" lists perturbations under which an expectation fails.

## Baseline (`baseline`, 1500 ticks, baseline score 0.280, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L6.eval_coverage` | 0.831 | − |
| `E6.ceiling` | -0.765 | + |
| `L2.eval_coverage_ref` | -0.757 | + |
| `L5.burn_scale` | -0.740 | + |
| `E1.channels.consumer.base` | -0.327 |  |
| `L9.tau` | 0.270 |  |
| `E4.scrutiny_base` | -0.266 |  |
| `L7.latency_threshold` | -0.238 |  |

## Model collapse (`collapse`, 480 ticks, baseline score 0.421, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L7.latency_threshold` | 0.300 | − |
| `L5.burn_scale` | -0.285 | + |
| `L2.generation_length` | 0.162 |  |
| `E2.h0` | -0.092 | + |
| `L2.distill_rate` | 0.058 | − |
| `E2.intake_capture` | -0.049 | + |
| `E2.leak_fraction` | 0.044 | − |
| `E2.accessibility` | -0.041 |  |

Also breaks under ±20%: `L2.alignment_neutral` (−).

## Dependence trap (`dependence`, 420 ticks, baseline score 0.247, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `E2.kappa` | 0.316 | − |
| `E1.channels.consumer.base` | 0.294 | − |
| `E1.delta` | 0.162 |  |
| `E1.rho` | -0.155 |  |
| `L7.latency_threshold` | 0.145 | − |
| `E2.h0` | 0.134 |  |
| `E6.ceiling` | -0.128 | + |
| `E1.channels.enterprise.base` | 0.118 |  |

Also breaks under ±20%: `E2.leak_fraction` (−).

## Engagement drift (`drift`, 420 ticks, baseline score 0.459, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `E1.channels.consumer.base` | 0.976 | − |
| `E1.channels.consumer.beta` | 0.496 |  |
| `L2.alignment_gain` | 0.384 |  |
| `L6.eta` | 0.374 |  |
| `L6.objective_anchor` | -0.359 |  |
| `E1.channels.enterprise.base` | -0.255 | − |
| `E1.ref_Au` | -0.216 |  |
| `L7.latency_threshold` | 0.214 | − |

Also breaks under ±20%: `E6.ceiling` (+).

## Legitimacy loss (`legitimacy`, 600 ticks, baseline score 0.010, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L9.Lambda_min` | -0.324 | + |
| `L5.burn_scale` | -0.256 | + |
| `L7.latency_threshold` | 0.080 | − |
| `L7.legitimacy_alarm` | 0.052 |  |
| `E4.scrutiny_rate` | 0.050 |  |
| `E6.ceiling` | 0.044 |  |
| `L2.eval_coverage_ref` | 0.038 |  |
| `E1.price_elasticity` | -0.035 |  |

## Compute starvation (`starvation`, 420 ticks, baseline score 0.055, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L3.infer_cost` | 0.770 | − |
| `E5.electricity_price` | 0.736 | − |
| `L3.theta` | -0.730 | + |
| `L3.depreciation` | 0.728 | − |
| `L2.C_min` | 0.707 | − |
| `L7.latency_threshold` | 0.684 | − |
| `E1.channels.consumer.base` | 0.673 | − |
| `E6.ceiling` | 0.283 | − |

Also breaks under ±20%: `L5.burn_scale` (+).

## Capital withdrawal (`withdrawal`, 900 ticks, baseline score 0.130, failing 0)

| coefficient | elasticity | breaks at |
|---|---:|---|
| `L5.burn_scale` | 0.587 | − + |
| `E1.channels.enterprise.base` | -0.552 | − + |
| `E1.channels.consumer.base` | -0.541 | − + |
| `E1.ref_Au` | 0.362 | − |
| `E1.channels.consumer.wtp` | -0.354 | − + |
| `L4.price.consumer` | -0.354 | − + |
| `E3.capital_available` | -0.347 | + |
| `E1.channels.enterprise.wtp` | -0.321 | + |

Also breaks under ±20%: `L4.price.enterprise` (+), `L9.tau` (−), `L7.latency_threshold` (−).

