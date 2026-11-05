// Hash routes: #scenario=collapse&t=120 links a scenario at a tick.
export interface Route { scenario: string; t: number }

export function readHash(): Route | null {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const scenario = h.get('scenario');
  if (!scenario) return null;
  const t = Math.max(0, Math.floor(Number(h.get('t') ?? 0)) || 0);
  return { scenario, t };
}

let last = '';
export function writeHash(r: Route): void {
  const next = `#scenario=${r.scenario}&t=${r.t}`;
  if (next === last) return;
  last = next;
  history.replaceState(null, '', next);
}

export function isOwnHash(): boolean { return location.hash === last; }
