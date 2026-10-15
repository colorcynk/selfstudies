import { describe, expect, it } from 'vitest'
import { enumeratePolygons } from './enumerate'
import { classifyShape } from './geometry'
import type { CountDiagram } from './types'

function segment(id: string, a: [number, number], b: [number, number]): CountDiagram['segments'][number] {
  return { id, start: { id: `${id}:a`, point: { x: a[0], y: a[1] } }, end: { id: `${id}:b`, point: { x: b[0], y: b[1] } } }
}
const grid: CountDiagram = { segments: [
  segment('bottom', [0, 0], [2, 0]), segment('middle-h', [0, 1], [2, 1]), segment('top', [0, 2], [2, 2]),
  segment('left', [0, 0], [0, 2]), segment('middle-v', [1, 0], [1, 2]), segment('right', [2, 0], [2, 2]),
] }

describe('enumeratePolygons', () => {
  it('finds the known 2x2 grid totals and allows internal lines', () => {
    const polygons = enumeratePolygons(grid).filter((item) => item.kind === 'polygon')
    expect(polygons.filter((p) => p.kind === 'polygon' && p.vertices.length === 4)).toHaveLength(9)
    expect(polygons.filter((p) => p.kind === 'polygon' && classifyShape({ kind: 'polygon', vertices: p.vertices }).has('square'))).toHaveLength(5)
  })
  it('joins collinear fragments, accepts crossings, and rejects a gap', () => {
    const fragments: CountDiagram = { segments: [
      segment('ab1', [0, 0], [1, 0]), segment('ab2', [1, 0], [2, 0]), segment('bc', [2, 0], [1, 1]),
      segment('ca', [1, 1], [0, 0]), segment('cross', [1, -1], [1, 1]),
    ] }
    expect(enumeratePolygons(fragments).some((s) => s.kind === 'polygon' && s.vertices.length === 3 && s.vertices.some((p) => p.x === 1 && p.y === 0))).toBe(true)
    const gap = { ...fragments, segments: fragments.segments.filter((s) => s.id !== 'ab2') }
    expect(enumeratePolygons(gap).some((s) => s.kind === 'polygon' && s.vertices.length === 3 && s.vertices.some((p) => p.x === 0 && p.y === 0) && s.vertices.some((p) => p.x === 2 && p.y === 0))).toBe(false)
  })
  it('rejects duplicate IDs, degenerate lines, and limit overflow', () => {
    const line = segment('x', [0, 0], [1, 0])
    expect(() => enumeratePolygons({ segments: [line, line] })).toThrow(/IDs/)
    expect(() => enumeratePolygons({ segments: [segment('z', [1, 1], [1, 1])] })).toThrow(/distinct/)
    expect(() => enumeratePolygons({ segments: Array.from({ length: 33 }, (_, i) => segment(`s${i}`, [i, 0], [i, 1])) })).toThrow(/32/)
  })
})
