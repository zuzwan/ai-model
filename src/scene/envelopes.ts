// Loop and model envelopes: soft translucent shells with contour rings.
import * as THREE from 'three';
import { ontology } from '../sim/ontology';
import style from './style.json';
import { type Part, edgeMaterial, fader } from './part';
import { shellMaterial, pod, podContours } from './organic';

export function buildEnvelopes(): Part[] {
  return ontology.envelopes.map((e) => {
    const l = e.layout;
    const k = style.organic.envelopeK;
    const group = new THREE.Group();
    group.position.set(l.x, l.y, l.z);
    const fm = shellMaterial(style.faceOpacity, style.faceColor, style.organic.envelopeRimGain);
    const em = edgeMaterial(style.organic.envelopeInk);
    const faces = new THREE.Mesh(pod(l.w, l.h, l.d, k), fm);
    faces.renderOrder = 1;
    const edges = new THREE.LineSegments(podContours(l.w, l.h, l.d, k), em);
    group.add(faces, edges);
    return { id: e.id, level: 'envelope', envelopeOf: e.id, object: group, pickables: [], ...fader([fm], [em], new THREE.Color(style.organic.envelopeInk)) };
  });
}
