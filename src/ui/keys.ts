// Key bindings. Each key dispatches an intent; main decides what it does.
export type Intent =
  | { type: 'camera'; preset: string }
  | { type: 'cycleEnvelopes' };

export function bindKeys(dispatch: (i: Intent) => void): void {
  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    if (k >= '5' && k <= '9') dispatch({ type: 'camera', preset: k });
    else if (k === 'm' || k === 'M') dispatch({ type: 'cycleEnvelopes' });
    else return;
    ev.preventDefault();
  });
}
