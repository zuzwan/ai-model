// The hidden menu, reached by the slash key: keys and scenarios. Nothing else.
import { scenarios } from '../sim/scenario';
import { KEY_HELP } from './keys';

export class Menu {
  readonly el: HTMLDivElement;
  open = false;

  constructor(onScenario: (id: string) => void) {
    this.el = document.createElement('div');
    this.el.className = 'menu';
    const keys = document.createElement('dl');
    for (const [k, v] of KEY_HELP) {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      keys.append(dt, dd);
    }
    const sc = document.createElement('dl');
    const order = ['0', 'q', 'w', 'e', 'r', 't', 'y'];
    for (const s of [...scenarios].sort((a, b) => order.indexOf(a.key ?? '') - order.indexOf(b.key ?? ''))) {
      const dt = document.createElement('dt'); dt.textContent = s.key ?? '';
      const dd = document.createElement('dd');
      const a = document.createElement('button');
      a.textContent = s.name;
      a.addEventListener('click', () => { onScenario(s.id); this.toggle(false); });
      dd.appendChild(a);
      sc.append(dt, dd);
    }
    this.el.append(keys, sc);
    document.body.appendChild(this.el);
  }

  toggle(on = !this.open) {
    this.open = on;
    this.el.classList.toggle('open', on);
  }
}
