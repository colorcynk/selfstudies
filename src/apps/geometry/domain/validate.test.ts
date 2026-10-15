import { describe, expect, it } from 'vitest'
import { validateCountQuestion, validateMatchQuestion } from './validate'
import type { CountDiagram, CountQuestion, MatchQuestion, Point } from './types'

const s = (id: string, a: Point, b: Point) => ({ id, start: { id: `${id}a`, point: a }, end: { id: `${id}b`, point: b } })
const triangle: CountDiagram = { segments: [s('a', { x: 0, y: 0 }, { x: 2, y: 0 }), s('b', { x: 2, y: 0 }, { x: 1, y: 2 }), s('c', { x: 1, y: 2 }, { x: 0, y: 0 })] }
const triangleSolution = { kind: 'polygon' as const, vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 2 }] }
function count(overrides: Partial<CountQuestion> = {}): CountQuestion {
  return { id: 'count:q1', stageId: 'count', mode: 'count', hint: 'hint', explanation: 'explanation', targetKind: 'isosceles', diagram: triangle, solutions: [triangleSolution], breakdown: [{ id: 'isosceles', label: '二等辺三角形', count: 1 }], ...overrides }
}

describe('validateMatchQuestion', () => {
  it('requires four valid candidates and exactly one congruent answer', () => {
    const shape = { kind: 'polygon' as const, vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 2 }] }
    const q: MatchQuestion = { id: 'match:q1', stageId: 'match', mode: 'match', hint: 'hint', explanation: 'explanation', example: shape, candidates: [
      { id: 'yes', shape: { kind: 'polygon', vertices: [{ x: 5, y: 0 }, { x: 7, y: 0 }, { x: 6, y: 2 }] } },
      { id: 'no1', shape: { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 1, y: 2 }] } },
      { id: 'no2', shape: { kind: 'circle', center: { x: 0, y: 0 }, radius: 1 } },
      { id: 'no3', shape: { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }] } },
    ], answerId: 'yes' }
    expect(() => validateMatchQuestion(q)).not.toThrow()
    expect(() => validateMatchQuestion({ ...q, candidates: [...q.candidates, { id: 'also', shape }] })).toThrow(/four/)
    expect(() => validateMatchQuestion({ ...q, candidates: [q.candidates[0], { ...q.candidates[0], id: 'second' }, ...q.candidates.slice(1, 3)] })).toThrow(/Exactly one/)
  })
})

describe('validateCountQuestion', () => {
  it('matches position-preserving contours across rotation noise and EPS rounding boundaries', () => {
    const makeSquareDiagram = (vertices: Point[]) => ({ segments: vertices.map((point, index) => s(`edge-${index}`, point, vertices[(index + 1) % vertices.length])) })
    const integerSquare = [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: -2, y: -2 }, { x: 0, y: -2 }]
    const angle = Math.PI
    const rotatedSquare = [{ x: 0, y: 0 }, { x: 2 * Math.cos(angle), y: 2 * Math.sin(angle) }, { x: 2 * (Math.cos(angle) - Math.sin(angle)), y: 2 * (Math.sin(angle) + Math.cos(angle)) }, { x: -2 * Math.sin(angle), y: 2 * Math.cos(angle) }]
    expect(() => validateCountQuestion(count({ targetKind: 'square', diagram: makeSquareDiagram(rotatedSquare), solutions: [{ kind: 'polygon', vertices: integerSquare }] }))).not.toThrow()

    const x = 0.00000049
    const nearBoundary = [{ x, y: 0 }, { x: x + 2, y: 0 }, { x: x + 2, y: 2 }, { x, y: 2 }]
    const handAuthored = nearBoundary.map((point) => ({ x: point.x + 0.00000002, y: point.y }))
    expect(() => validateCountQuestion(count({ targetKind: 'square', diagram: makeSquareDiagram(nearBoundary), solutions: [{ kind: 'polygon', vertices: handAuthored }] }))).not.toThrow()
  })

  it('checks full contour sets, target kind and out-of-scope triangles even for a circle target', () => {
    expect(() => validateCountQuestion(count())).not.toThrow()
    expect(() => validateCountQuestion(count({ solutions: [] }))).toThrow(/exactly match/)
    expect(() => validateCountQuestion(count({ solutions: [triangleSolution, { ...triangleSolution }] }))).toThrow(/duplicates/)
    expect(() => validateCountQuestion(count({ targetKind: 'right-triangle' }))).toThrow(/exactly match/)
    const forbidden: CountDiagram = { segments: [s('a', { x: 0, y: 0 }, { x: 4, y: 0 }), s('b', { x: 4, y: 0 }, { x: 1, y: 3 }), s('c', { x: 1, y: 3 }, { x: 0, y: 0 })], circles: [{ id: 'circle', center: { x: 20, y: 20 }, radius: 1 }] }
    expect(() => validateCountQuestion(count({ diagram: forbidden, targetKind: 'circle', solutions: [{ kind: 'circle', circleId: 'circle' }] }))).toThrow(/Every triangle/)
  })
  it('rejects added or removed lines and malformed circles', () => {
    const square: CountDiagram = { segments: [s('a', { x: 0, y: 0 }, { x: 1, y: 0 }), s('b', { x: 1, y: 0 }, { x: 1, y: 1 }), s('c', { x: 1, y: 1 }, { x: 0, y: 1 }), s('d', { x: 0, y: 1 }, { x: 0, y: 0 })] }
    const squareSol = { kind: 'polygon' as const, vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] }
    const base = count({ diagram: square, targetKind: 'square', solutions: [squareSol] })
    expect(() => validateCountQuestion(base)).not.toThrow()
    expect(() => validateCountQuestion({ ...base, diagram: { ...square, segments: square.segments.slice(1) } })).toThrow(/exactly match/)
    expect(() => validateCountQuestion({ ...base, diagram: { ...square, segments: [...square.segments, s('extension', { x: 1, y: 1 }, { x: 2, y: 1 }), s('top-extension', { x: 2, y: 1 }, { x: 2, y: 0 }), s('right-extension', { x: 2, y: 0 }, { x: 1, y: 0 })] } })).toThrow(/exactly match/)
    expect(() => validateCountQuestion(count({ diagram: { ...triangle, circles: [{ id: 'bad', center: { x: 0, y: 0 }, radius: 0 }] } }))).toThrow(/positive radius/)
  })
})
