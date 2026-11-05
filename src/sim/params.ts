import defaults from './params.default.json';

type Widen<T> = T extends number ? number : T extends string ? string : T extends (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };

export interface Schedule { path: string; from: number; to?: number; value: number }

export type Params = Omit<Widen<typeof defaults>, 'valves' | 'apertures' | 'schedules'> & {
  /** Flow gain multipliers, 0..2, keyed by flow ID. Missing means 1. */
  valves: Record<string, number>;
  /** Surface aperture multipliers, 0..1, keyed by surface ID; one entry per aperture. Missing means 1. */
  apertures: Record<string, number[]>;
  /** Exogenous step changes: param `path` takes `value` for from <= t < to. */
  schedules: Schedule[];
};

export const defaultParams: Params = defaults as unknown as Params;

export function clone<T>(x: T): T {
  return structuredClone(x);
}

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}

export function setPath(obj: unknown, path: string, value: unknown): void {
  const keys = path.split('.');
  let o = obj as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) {
    if (o[k] === undefined) throw new Error(`unknown param path ${path}`);
    o = o[k] as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  if (!(last in o) && !path.startsWith('valves.') && !path.startsWith('apertures.')) throw new Error(`unknown param path ${path}`);
  o[last] = value;
}

/** Apply dotted-path overrides to a copy of params. */
export function withOverrides(p: Params, overrides: Record<string, unknown>): Params {
  const q = clone(p);
  for (const [k, v] of Object.entries(overrides)) {
    if (k === 'schedules') q.schedules = [...q.schedules, ...(v as Schedule[])];
    else setPath(q, k, v);
  }
  return q;
}

/** Params in force at tick t, with schedules applied. Returns the same object when no schedule applies. */
export function paramsAt(p: Params, t: number): Params {
  const active = p.schedules.filter((s) => t >= s.from && (s.to === undefined || t < s.to));
  if (active.length === 0) return p;
  const q = clone(p);
  for (const s of active) setPath(q, s.path, s.value);
  return q;
}

export const valve = (p: Params, id: string): number => p.valves[id] ?? 1;
export const aperture = (p: Params, id: string, i = 0): number => p.apertures[id]?.[i] ?? 1;
