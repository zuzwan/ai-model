// Key bindings. Each key dispatches an intent; main decides what it does.
import ui from './ui.json';

export type Intent =
  | { type: 'camera'; preset: string }
  | { type: 'cycleEnvelopes' }
  | { type: 'togglePlay' }
  | { type: 'step'; by: number }
  | { type: 'scrub'; by: number }
  | { type: 'speed'; index: number }
  | { type: 'toggleStrip' };

export function bindKeys(dispatch: (i: Intent) => void): void {
  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    let intent: Intent | null = null;
    if (k >= '5' && k <= '9') intent = { type: 'camera', preset: k };
    else if (k >= '1' && k <= '4') intent = { type: 'speed', index: Number(k) - 1 };
    else if (k === 'm' || k === 'M') intent = { type: 'cycleEnvelopes' };
    else if (k === ' ') intent = { type: 'togglePlay' };
    else if (k === '.') intent = { type: 'step', by: 1 };
    else if (k === ',') intent = { type: 'step', by: -1 };
    else if (k === 'ArrowRight') intent = { type: 'scrub', by: ev.shiftKey ? ui.scrubShiftStep : ui.scrubStep };
    else if (k === 'ArrowLeft') intent = { type: 'scrub', by: -(ev.shiftKey ? ui.scrubShiftStep : ui.scrubStep) };
    else if (k === 'h' || k === 'H') intent = { type: 'toggleStrip' };
    if (!intent) return;
    ev.preventDefault();
    dispatch(intent);
  });
}
