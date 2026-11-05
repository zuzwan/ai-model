import raw from './ontology.json';

export type Level = 'loop' | 'model' | 'env';
export type Face = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

export interface Layout {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  shape: 'box' | 'cylinder' | 'slab' | 'tube' | 'tray' | 'ring' | 'plane' | 'cloud' | 'prism';
  rest?: number;
  channels?: number;
  axis?: 'x' | 'y' | 'z';
  face?: Face;
  /** For environment fields: the direction flows leave the field. */
  normal?: [number, number, number];
  radius?: number;
}

export interface Component {
  id: string;
  level: Level;
  kind: 'chamber' | 'conduit' | 'field';
  name: string;
  stocks: string[];
  derived: string[];
  layout: Layout;
}

export interface Envelope { id: 'loop' | 'model'; layout: Layout }

export interface Substance {
  id: string;
  particle: { color: string; size: number; speed: number; cap: number };
  conduit: { color: string; style: 'tube' | 'dashed' | 'none' };
}

export interface Surface {
  id: string;
  name: string;
  env: string;
  loopComponent: string[];
  apertureDriver: string;
  apertures: string[];
  inbound: string[];
  outbound: string[];
  layout: { face: Face; x: number; y: number; z: number; w: number; h: number; rest: number; membrane: boolean };
}

export interface Flow {
  id: string;
  from: string;
  to: string;
  substance: string;
  rateFn: string;
  valveable: boolean;
  renders: boolean;
  surface?: string;
}

export interface Sink { id: string; layout: { x: number; y: number; z: number } }

export interface Ontology {
  components: Component[];
  envelopes: Envelope[];
  sinks: Sink[];
  substances: Substance[];
  surfaces: Surface[];
  flows: Flow[];
}

export const ontology = raw as unknown as Ontology;

export const componentById = new Map(ontology.components.map((c) => [c.id, c]));
export const substanceById = new Map(ontology.substances.map((s) => [s.id, s]));
export const surfaceById = new Map(ontology.surfaces.map((s) => [s.id, s]));
export const flowById = new Map(ontology.flows.map((f) => [f.id, f]));
