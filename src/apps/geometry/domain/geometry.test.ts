import { describe, expect, it } from 'vitest'
import { classifyShape, getCongruenceTransform, isSameSizeAndShape, validateShape } from './geometry'
import type { Shape } from './types'

const square: Shape = { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] }
const triangle: Shape = { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 1, y: 2 }] }

describe('geometry domain', () => {
  it('classifies inclusive polygon kinds', () => {
    expect(classifyShape(square)).toEqual(new Set(['rectangle', 'square']))
    expect(classifyShape({ kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: Math.sqrt(3) }] }))
      .toEqual(new Set(['equilateral', 'isosceles']))
    expect(classifyShape({ kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }] }))
      .toEqual(new Set(['isosceles', 'right-triangle']))
  })

  it('matches a known translation and rotation and returns an overlay transform', () => {
    const target: Shape = { kind: 'polygon', vertices: [{ x: 8, y: -3 }, { x: 8, y: -1 }, { x: 6, y: -1 }, { x: 6, y: -3 }] }
    const transform = getCongruenceTransform(square, target)
    expect(transform).not.toBeNull()
    expect(isSameSizeAndShape(square, target)).toBe(true)
    expect(transform?.vertexMap).toHaveLength(4)
  })

  it('ignores cyclic start and reversed vertex enumeration, while rejecting a reflected asymmetric shape', () => {
    const cyclic: Shape = { kind: 'polygon', vertices: [{ x: 2, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 0 }, { x: 2, y: 0 }] }
    const reversed: Shape = { kind: 'polygon', vertices: [{ x: 0, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 0 }, { x: 0, y: 0 }] }
    expect(isSameSizeAndShape(square, cyclic)).toBe(true)
    expect(isSameSizeAndShape(square, reversed)).toBe(true)
    const mirror: Shape = { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: -4, y: 0 }, { x: -1, y: 2 }] }
    expect(isSameSizeAndShape(triangle, mirror)).toBe(false)
  })

  it('rejects scale, changed aspect ratio, and a different circle radius', () => {
    expect(isSameSizeAndShape(square, { kind: 'polygon', vertices: square.kind === 'polygon' ? square.vertices.map((p) => ({ x: p.x * 2, y: p.y * 2 })) : [] })).toBe(false)
    const rectangle: Shape = { kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 2 }] }
    expect(isSameSizeAndShape(square, rectangle)).toBe(false)
    expect(isSameSizeAndShape({ kind: 'circle', center: { x: 0, y: 0 }, radius: 2 }, { kind: 'circle', center: { x: 9, y: 8 }, radius: 3 })).toBe(false)
    expect(isSameSizeAndShape({ kind: 'circle', center: { x: 0, y: 0 }, radius: 2 }, { kind: 'circle', center: { x: 5, y: 3 }, radius: 2 })).toBe(true)
  })

  it('rejects malformed and degenerate shapes', () => {
    expect(() => validateShape({ kind: 'circle', center: { x: 0, y: 0 }, radius: 0 })).toThrow(RangeError)
    expect(() => validateShape({ kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] })).toThrow(RangeError)
    expect(() => validateShape({ kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }] })).toThrow(RangeError)
    expect(() => validateShape({ kind: 'polygon', vertices: [{ x: 0, y: 1 }, { x: 0.951, y: -0.309 }, { x: -0.588, y: 0.809 }, { x: 0.588, y: 0.809 }, { x: -0.951, y: -0.309 }] })).toThrow(RangeError)
    expect(() => validateShape({ kind: 'polygon', vertices: [{ x: 0, y: 0 }, { x: Infinity, y: 0 }, { x: 0, y: 1 }] })).toThrow(RangeError)
  })
})
