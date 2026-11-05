// Loop and model envelopes: translucent rounded prisms with thin black edges.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ontology } from '../sim/ontology';
import style from './style.json';
import { type Part, faceMaterial, edgeMaterial, fader } from './part';

export function buildEnvelopes(): Part[] {
  return ontology.envelopes.map((e) => {
    const l = e.layout;
    const r = l.radius ?? 0;
    const group = new THREE.Group();
    group.position.set(l.x, l.y, l.z);
    const fm = faceMaterial(style.faceOpacity);
    const em = edgeMaterial();
    const faces = new THREE.Mesh(new RoundedBoxGeometry(l.w, l.h, l.d, 4, r), fm);
    faces.renderOrder = 1;
    // Edges drawn on the 45-degree line of each rounded edge.
    const inset = r * (1 - Math.SQRT1_2) * 2;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(l.w - inset, l.h - inset, l.d - inset)), em);
    group.add(faces, edges);
    return { id: e.id, level: 'envelope', envelopeOf: e.id, object: group, pickables: [], ...fader([fm], [em]) };
  });
}
