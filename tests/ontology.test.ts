import { describe, it, expect } from 'vitest';
import { ontology, componentById, surfaceById } from '../src/sim/ontology';

describe('ontology', () => {
  it('has the inventory from the brief', () => {
    const internal = ontology.components.filter((c) => c.level !== 'env');
    expect(internal.filter((c) => c.level === 'loop').map((c) => c.id)).toEqual(
      ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11']);
    expect(internal.filter((c) => c.level === 'model').map((c) => c.id)).toEqual(['M1', 'M2', 'M3', 'M4']);
    expect(ontology.components.filter((c) => c.level === 'env').map((c) => c.id)).toEqual(
      ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']);
    expect(ontology.surfaces.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    expect(ontology.flows.map((f) => f.id)).toEqual(Array.from({ length: 34 }, (_, i) => `F${i + 1}`));
  });

  it('every flow joins known nodes with a known substance', () => {
    const sinks = new Set(ontology.sinks.map((s) => s.id));
    const subs = new Set(ontology.substances.map((s) => s.id));
    for (const f of ontology.flows) {
      expect(componentById.has(f.from) || sinks.has(f.from), f.id).toBe(true);
      expect(componentById.has(f.to) || sinks.has(f.to), f.id).toBe(true);
      expect(subs.has(f.substance), f.id).toBe(true);
    }
  });

  it('nothing crosses the loop envelope except through a surface', () => {
    for (const f of ontology.flows) {
      const a = componentById.get(f.from)?.level ?? 'sink';
      const b = componentById.get(f.to)?.level ?? 'sink';
      const crosses = (a === 'env') !== (b === 'env');
      if (crosses) {
        expect(f.surface, f.id).toBeDefined();
        const s = surfaceById.get(f.surface!)!;
        expect([...s.inbound, ...s.outbound]).toContain(f.id);
      }
    }
  });

  it('no model-level component produces another model-level component (only flows of context/outputs)', () => {
    const model = new Set(ontology.components.filter((c) => c.level === 'model').map((c) => c.id));
    const internal = ontology.flows.filter((f) => model.has(f.from) && model.has(f.to));
    expect(internal.map((f) => f.id)).toEqual(['F11']);
  });
});
