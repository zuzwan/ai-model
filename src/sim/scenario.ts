// Scenario presets: parameter overrides, start overrides and expected trajectories.
import { defaultParams, withOverrides, type Params, type Schedule } from './params';
import { init, type State } from './state';

export interface Expectation { var: string; at: number; op: '<' | '>' | '<=' | '>=' | '=='; value: number | string; tol?: number; why?: string }
export interface Scenario {
  id: string;
  name: string;
  key?: string;
  seed: number;
  paramOverrides: Record<string, unknown>;
  startOverrides: Record<string, unknown>;
  schedules?: Schedule[];
  expect: Expectation[];
}

const files = import.meta.glob('./scenarios/*.json', { eager: true, import: 'default' }) as Record<string, Scenario>;
export const scenarios: Scenario[] = Object.values(files);
export const scenarioById = new Map(scenarios.map((s) => [s.id, s]));

export function scenarioParams(sc: Scenario, base: Params = defaultParams): Params {
  const startOv = Object.fromEntries(Object.entries(sc.startOverrides).map(([k, v]) => [`start.${k}`, v]));
  const p = withOverrides(base, { ...sc.paramOverrides, ...startOv });
  if (sc.schedules) p.schedules = [...p.schedules, ...sc.schedules];
  return p;
}

export function loadScenario(id: string, seed?: number): { scenario: Scenario; params: Params; state: State } {
  const scenario = scenarioById.get(id);
  if (!scenario) throw new Error(`unknown scenario ${id}`);
  const params = scenarioParams(scenario);
  return { scenario, params, state: init(params, seed ?? scenario.seed) };
}
