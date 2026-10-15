import type { CongruenceTransform, Point, Shape, ShapeKind } from './types'

/** Relative tolerance for geometric comparisons. */
export const EPS = 1e-6
/** Coordinates are limited to small teaching units to keep floating point operations stable. */
export const MAX_COORDINATE = 1_000

export function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b))
}

function finitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && Math.abs(point.x) <= MAX_COORDINATE && Math.abs(point.y) <= MAX_COORDINATE
}

function cross(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function polygonArea(vertices: Point[]): number {
  return vertices.reduce((area, point, index) => {
    const next = vertices[(index + 1) % vertices.length]
    return area + point.x * next.y - next.x * point.y
  }, 0) / 2
}

/** Throws RangeError for malformed, degenerate, or non-convex shapes. */
export function validateShape(shape: Shape): void {
  if (shape.kind === 'circle') {
    if (!finitePoint(shape.center)) throw new RangeError('Circle center must be finite and within coordinate limits')
    if (!Number.isFinite(shape.radius) || shape.radius <= 0 || shape.radius > MAX_COORDINATE) {
      throw new RangeError('Circle radius must be positive, finite, and within coordinate limits')
    }
    return
  }
  const vertices = shape.vertices
  if (vertices.length < 3 || vertices.length > 32) throw new RangeError('Polygon must have 3 to 32 vertices')
  if (!vertices.every(finitePoint)) throw new RangeError('Polygon vertices must be finite and within coordinate limits')
  for (let i = 0; i < vertices.length; i += 1) {
    if (distance(vertices[i], vertices[(i + 1) % vertices.length]) <= EPS) {
      throw new RangeError('Polygon edges must have positive length')
    }
  }
  const area = polygonArea(vertices)
  if (Math.abs(area) <= EPS) throw new RangeError('Polygon must have nonzero area')
  let sign = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const turn = cross(vertices[i], vertices[(i + 1) % vertices.length], vertices[(i + 2) % vertices.length])
    if (Math.abs(turn) <= EPS) throw new RangeError('Polygon must not contain collinear consecutive vertices')
    const nextSign = Math.sign(turn)
    if (sign && sign !== nextSign) throw new RangeError('Polygon must be strictly convex and consistently ordered')
    sign = nextSign
  }
  // Consistent local turns alone also admit star polygons. Every other vertex
  // must lie strictly on the same side of every directed edge.
  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = 0; j < vertices.length; j += 1) {
      if (j === i || j === (i + 1) % vertices.length) continue
      const side = cross(vertices[i], vertices[(i + 1) % vertices.length], vertices[j])
      if (Math.sign(side) !== sign || Math.abs(side) <= EPS) {
        throw new RangeError('Polygon must be strictly convex and simple')
      }
    }
  }
}

function dot(a: Point, b: Point, c: Point): number {
  return (a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)
}

export function classifyShape(shape: Shape): Set<ShapeKind> {
  validateShape(shape)
  if (shape.kind === 'circle') return new Set(['circle'])
  const points = shape.vertices
  const kinds = new Set<ShapeKind>()
  if (points.length === 3) {
    const sides = points.map((p, i) => distance(p, points[(i + 1) % 3]))
    if (nearlyEqual(sides[0], sides[1]) && nearlyEqual(sides[1], sides[2])) kinds.add('equilateral')
    if (sides.some((side, i) => nearlyEqual(side, sides[(i + 1) % 3]))) kinds.add('isosceles')
    if (points.some((p, i) => nearlyEqual(dot(points[(i + 2) % 3], p, points[(i + 1) % 3]), 0))) {
      kinds.add('right-triangle')
    }
  }
  if (points.length === 4) {
    const sides = points.map((p, i) => distance(p, points[(i + 1) % 4]))
    const rightAtEveryVertex = points.every((p, i) => nearlyEqual(
      dot(points[(i + 3) % 4], p, points[(i + 1) % 4]), 0,
    ))
    if (rightAtEveryVertex && nearlyEqual(sides[0], sides[2]) && nearlyEqual(sides[1], sides[3])) {
      kinds.add('rectangle')
      if (nearlyEqual(sides[0], sides[1])) kinds.add('square')
    }
  }
  return kinds
}

function centroid(points: Point[]): Point {
  return points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 })
}

function rotate(point: Point, angle: number): Point {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return { x: cosine * point.x - sine * point.y, y: sine * point.x + cosine * point.y }
}

function orderedCCW(vertices: Point[]): Point[] {
  return polygonArea(vertices) > 0 ? vertices : [...vertices].reverse()
}

/** Returns a source-to-target proper rotation and translation when congruent. */
export function getCongruenceTransform(source: Shape, target: Shape): CongruenceTransform | null {
  validateShape(source)
  validateShape(target)
  if (source.kind !== target.kind) return null
  if (source.kind === 'circle' && target.kind === 'circle') {
    if (!nearlyEqual(source.radius, target.radius)) return null
    return { rotation: 0, translation: { x: target.center.x - source.center.x, y: target.center.y - source.center.y } }
  }
  if (source.kind !== 'polygon' || target.kind !== 'polygon' || source.vertices.length !== target.vertices.length) return null
  const a = orderedCCW(source.vertices)
  const b = orderedCCW(target.vertices)
  const ca = centroid(a)
  const cb = centroid(b)
  for (let offset = 0; offset < a.length; offset += 1) {
    const ai = a.map((_, i) => (i + offset) % a.length)
    const va = a[ai[0]]
    const vb = b[0]
    const rawAngle = Math.atan2(vb.y - cb.y, vb.x - cb.x) - Math.atan2(va.y - ca.y, va.x - ca.x)
    const angle = Math.atan2(Math.sin(rawAngle), Math.cos(rawAngle))
    const rotated = ai.map((index) => rotate({ x: a[index].x - ca.x, y: a[index].y - ca.y }, angle))
    const translation = { x: cb.x - rotate(ca, angle).x, y: cb.y - rotate(ca, angle).y }
    if (rotated.every((point, i) => nearlyEqual(point.x + cb.x, b[i].x) && nearlyEqual(point.y + cb.y, b[i].y))) {
      // Offset matching is in CCW order; map original indices to target order for overlays.
      const sourceMap = b.map((_, bi) => source.vertices.findIndex((point) => nearlyEqual(point.x, a[ai[bi]].x) && nearlyEqual(point.y, a[ai[bi]].y)))
      const vertexMap = target.vertices.map((point) => {
        const targetIndex = b.findIndex((ordered) => nearlyEqual(point.x, ordered.x) && nearlyEqual(point.y, ordered.y))
        return sourceMap[targetIndex]
      })
      return { rotation: angle, translation, vertexMap }
    }
  }
  return null
}

export function isSameSizeAndShape(a: Shape, b: Shape): boolean {
  return getCongruenceTransform(a, b) !== null
}
