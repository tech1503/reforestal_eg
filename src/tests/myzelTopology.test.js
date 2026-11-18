import { describe, it, expect } from 'vitest';
import {
  buildMyzelTopology,
  flattenTopology,
  peersByDegree,
  MAX_MYZEL_DEPTH,
} from '@/utils/myzelTopology';

const ACTOR = 'actor-1';

const treeEdges = [
  { a: ACTOR, b: 'd1-a' },
  { a: ACTOR, b: 'd1-b' },
  { a: 'd1-a', b: 'd2-a' },
  { a: 'd1-a', b: 'd2-b' },
  { a: 'd1-b', b: 'd2-c' },
  { a: 'd2-a', b: 'd3-a' },
  { a: 'd2-b', b: 'd3-b' },
  { a: 'd2-c', b: 'd3-c' },
  { a: 'd3-a', b: 'd4-a' },
  { a: 'd3-b', b: 'd4-b' },
  { a: 'd3-c', b: 'd4-c' },
];

describe('buildMyzelTopology — BFS reticular no dirigido (REQ-06)', () => {
  it('asigna el grado mínimo por BFS en un árbol de 4 grados', () => {
    const degrees = buildMyzelTopology(ACTOR, treeEdges);
    expect(degrees[1].map((p) => p.id)).toEqual(['d1-a', 'd1-b']);
    expect(degrees[2].map((p) => p.id)).toEqual(['d2-a', 'd2-b', 'd2-c']);
    expect(degrees[3].map((p) => p.id)).toEqual(['d3-a', 'd3-b', 'd3-c']);
    expect(degrees[4].map((p) => p.id)).toEqual(['d4-a', 'd4-b', 'd4-c']);
  });

  it('un enlace anastomosis conecta indistintamente la dirección (simetría)', () => {
    const edges = [{ user_a_id: 'x-1', user_b_id: ACTOR, via: 'anastomosis' }];
    const degrees = buildMyzelTopology(ACTOR, edges);
    expect(degrees[1]).toEqual([{ id: 'x-1', degree: 1, via: 'anastomosis' }]);
  });

  it('los ciclos no inflan grados ni duplican nodos', () => {
    const cyclic = [
      { a: ACTOR, b: 'n-1' },
      { a: 'n-1', b: 'n-2' },
      { a: 'n-2', b: ACTOR },
      { a: 'n-2', b: 'n-3' },
    ];
    const degrees = buildMyzelTopology(ACTOR, cyclic);
    expect(degrees[1].map((p) => p.id)).toEqual(['n-1', 'n-2']);
    expect(degrees[2].map((p) => p.id)).toEqual(['n-3']);
    expect(degrees[3]).toEqual([]);
    expect(flattenTopology(degrees)).toHaveLength(3);
  });

  it('profundidad máxima 4: nodos más allá del 4º grado no aparecen', () => {
    const edges = [
      { a: ACTOR, b: 'a' },
      { a: 'a', b: 'b' },
      { a: 'b', b: 'c' },
      { a: 'c', b: 'd' },
      { a: 'd', b: 'e' },
    ];
    const degrees = buildMyzelTopology(ACTOR, edges);
    expect(degrees[4].map((p) => p.id)).toEqual(['d']);
    expect(flattenTopology(degrees).map((p) => p.id)).not.toContain('e');
    expect(MAX_MYZEL_DEPTH).toBe(4);
  });

  it('una red vacía devuelve los 4 grados vacíos', () => {
    const degrees = buildMyzelTopology(ACTOR, []);
    expect(peersByDegree(degrees)).toEqual({ degree1: 0, degree2: 0, degree3: 0, degree4: 0 });
  });

  it('peersByDegree cuenta correctamente', () => {
    const degrees = buildMyzelTopology(ACTOR, treeEdges);
    expect(peersByDegree(degrees)).toEqual({ degree1: 2, degree2: 3, degree3: 3, degree4: 3 });
  });
});
