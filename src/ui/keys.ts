// Key bindings. Each key dispatches an intent; main decides what it does.
import ui from './ui.json';
import { scenarios } from '../sim/scenario';

export type Intent =
  | { type: 'camera'; preset: string }
  | { type: 'cycleEnvelopes' }
  | { type: 'togglePlay' }
  | { type: 'step'; by: number }
  | { type: 'scrub'; by: number }
  | { type: 'speed'; index: number }
  | { type: 'toggleStrip' }
  | { type: 'scenario'; id: string }
  | { type: 'umwelt' }
  | { type: 'fork' }
  | { type: 'escape' }
  | { type: 'menu' };

const scenarioKeys = new Map(scenarios.filter((s) => s.key).map((s) => [s.key!, s.id]));

/** Key list for the hidden menu: [keys, action]. */
export const KEY_HELP: [string, string][] = [
  ['space', 'run / pause'], ['.  ,', 'step forward / back'], ['←  →', 'scrub (shift: 30)'],
  ['1–4', 'speed'], ['5–9', 'views'], ['m', 'envelopes'], ['u', 'umwelt'], ['f', 'fork'],
  ['h', 'strip'], ['esc', 'reset'], ['/', 'this menu'],
];

export function bindKeys(dispatch: (i: Intent) => void): void {
  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    const lower = k.toLowerCase();
    let intent: Intent | null = null;
    if (k >= '5' && k <= '9') intent = { type: 'camera', preset: k };
    else if (k >= '1' && k <= '4') intent = { type: 'speed', index: Number(k) - 1 };
    else if (scenarioKeys.has(lower)) intent = { type: 'scenario', id: scenarioKeys.get(lower)! };
    else if (lower === 'm') intent = { type: 'cycleEnvelopes' };
    else if (lower === 'u') intent = { type: 'umwelt' };
    else if (lower === 'f') intent = { type: 'fork' };
    else if (lower === 'h') intent = { type: 'toggleStrip' };
    else if (k === ' ') intent = { type: 'togglePlay' };
    else if (k === '.') intent = { type: 'step', by: 1 };
    else if (k === ',') intent = { type: 'step', by: -1 };
    else if (k === 'ArrowRight') intent = { type: 'scrub', by: ev.shiftKey ? ui.scrubShiftStep : ui.scrubStep };
    else if (k === 'ArrowLeft') intent = { type: 'scrub', by: -(ev.shiftKey ? ui.scrubShiftStep : ui.scrubStep) };
    else if (k === 'Escape') intent = { type: 'escape' };
    else if (k === '/') intent = { type: 'menu' };
    if (!intent) return;
    ev.preventDefault();
    dispatch(intent);
  });
}
