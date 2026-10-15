import type { CountDiagram, CountSolution, Point } from './types'
import { EPS, MAX_COORDINATE, nearlyEqual, validateShape } from './geometry'

export class DiagramError extends Error {
  constructor(public readonly id: string, message: string) { super(message); this.name = 'DiagramError' }
}

const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const same = (a: Point, b: Point) => nearlyEqual(a.x, b.x) && nearlyEqual(a.y, b.y)

export function sameBoundary(a: Point[], b: Point[]): boolean {
  if (a.length !== b.length) return false
  for (const direction of [1, -1]) {
    for (let offset = 0; offset < b.length; offset += 1) {
      if (a.every((point, i) => same(point, b[(offset + direction * i + b.length * 2) % b.length]))) return true
    }
  }
  return false
}

interface Segment { a: Point; b: Point }

function intersection(a: Segment, b: Segment): Point[] {
  const r = { x: a.b.x - a.a.x, y: a.b.y - a.a.y }
  const s = { x: b.b.x - b.a.x, y: b.b.y - b.a.y }
  const den = r.x * s.y - r.y * s.x
  const q = { x: b.a.x - a.a.x, y: b.a.y - a.a.y }
  if (Math.abs(den) <= EPS) {
    if (Math.abs(q.x * r.y - q.y * r.x) > EPS) return []
    return [a.a, a.b, b.a, b.b].filter((p) => onSegment(p, a) && onSegment(p, b))
  }
  const t = (q.x * s.y - q.y * s.x) / den
  const u = (q.x * r.y - q.y * r.x) / den
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return []
  return [{ x: a.a.x + t * r.x, y: a.a.y + t * r.y }]
}

function onSegment(p: Point, s: Segment): boolean {
  return Math.abs(cross(s.a, s.b, p)) <= EPS * Math.max(1, dist(s.a, s.b))
    && p.x >= Math.min(s.a.x, s.b.x) - EPS && p.x <= Math.max(s.a.x, s.b.x) + EPS
    && p.y >= Math.min(s.a.y, s.b.y) - EPS && p.y <= Math.max(s.a.y, s.b.y) + EPS
}

function normalize(diagram: CountDiagram): { points: Point[]; segments: Segment[] } {
  if (diagram.segments.length > 32) throw new DiagramError('diagram.too_many_segments', 'A diagram may have at most 32 segments')
  const ids = new Set<string>()
  const endpointIds = new Map<string, Point>()
  const segments: Segment[] = []
  for (const item of diagram.segments) {
    if (!item.id || ids.has(item.id) || !item.start.id || !item.end.id || item.start.id === item.end.id) throw new DiagramError('diagram.invalid_segment_id', 'Segment and endpoint IDs must be unique and non-empty')
    ids.add(item.id)
    const { start, end } = item
    if (![start.point.x, start.point.y, end.point.x, end.point.y].every(Number.isFinite)
      || [start.point.x, start.point.y, end.point.x, end.point.y].some((v) => Math.abs(v) > MAX_COORDINATE)
      || dist(start.point, end.point) <= EPS) throw new DiagramError('diagram.invalid_segment', 'Segment endpoints must be finite, within coordinate limits, and distinct')
    for (const endpoint of [start, end]) {
      const known = endpointIds.get(endpoint.id)
      if (known && !same(known, endpoint.point)) throw new DiagramError('diagram.endpoint_id_conflict', 'An endpoint ID cannot name multiple coordinates')
      endpointIds.set(endpoint.id, endpoint.point)
    }
    segments.push({ a: start.point, b: end.point })
  }
  const points: Point[] = []
  const add = (p: Point) => { if (!points.some((q) => same(p, q))) points.push(p) }
  segments.forEach((s) => { add(s.a); add(s.b) })
  for (let i = 0; i < segments.length; i += 1) for (let j = i + 1; j < segments.length; j += 1) intersection(segments[i], segments[j]).forEach(add)
  if (points.length > 36) throw new DiagramError('diagram.too_many_vertices', 'A diagram may have at most 36 normalized vertices')
  return { points, segments }
}

function covered(a: Point, b: Point, segments: Segment[]): boolean {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy
  const intervals: [number, number][] = []
  for (const s of segments) {
    if (Math.abs(cross(a, b, s.a)) > EPS * Math.max(1, Math.sqrt(length2)) || Math.abs(cross(a, b, s.b)) > EPS * Math.max(1, Math.sqrt(length2))) continue
    const t1 = ((s.a.x - a.x) * dx + (s.a.y - a.y) * dy) / length2
    const t2 = ((s.b.x - a.x) * dx + (s.b.y - a.y) * dy) / length2
    const lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(1, Math.max(t1, t2))
    if (hi >= lo - EPS) intervals.push([lo, hi])
  }
  intervals.sort((x, y) => x[0] - y[0])
  let end = 0
  for (const [lo, hi] of intervals) {
    if (lo > end + EPS) return false
    end = Math.max(end, hi)
    if (end >= 1 - EPS) return true
  }
  return false
}

function convex(vertices: Point[]): boolean {
  let sign = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const c = cross(vertices[i], vertices[(i + 1) % vertices.length], vertices[(i + 2) % vertices.length])
    if (Math.abs(c) <= EPS) return false
    if (sign && Math.sign(c) !== sign) return false
    sign = Math.sign(c)
  }
  return true
}

function simplify(vertices: Point[]): Point[] {
  let result = vertices
  let changed = true
  while (changed && result.length > 3) {
    changed = false
    result = result.filter((p, i) => {
      const prev = result[(i + result.length - 1) % result.length], next = result[(i + 1) % result.length]
      if (Math.abs(cross(prev, p, next)) <= EPS && onSegment(p, { a: prev, b: next })) { changed = true; return false }
      return true
    })
  }
  return result
}

/** Enumerates all fully drawn, nondegenerate triangles and convex quadrilaterals. */
export function enumeratePolygons(diagram: CountDiagram): CountSolution[] {
  const { points, segments } = normalize(diagram)
  const results: CountSolution[] = []
  for (let n = 3; n <= 4; n += 1) {
    const chosen: Point[] = []
    const visit = (start: number) => {
      if (chosen.length === n) {
        const center = chosen.reduce((sum, p) => ({ x: sum.x + p.x / n, y: sum.y + p.y / n }), { x: 0, y: 0 })
        const ordered = [...chosen].sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x))
        if (!convex(ordered) || !ordered.every((p, i) => covered(p, ordered[(i + 1) % n], segments))) return
        const vertices = simplify(ordered)
        if (vertices.length !== 3 && vertices.length !== 4) return
        try { validateShape({ kind: 'polygon', vertices }) } catch { return }
        if (!results.some((item) => item.kind === 'polygon' && sameBoundary(item.vertices, vertices))) results.push({ kind: 'polygon', vertices })
        return
      }
      for (let i = start; i < points.length; i += 1) { chosen.push(points[i]); visit(i + 1); chosen.pop() }
    }
    visit(0)
  }
  return results
}

export function sameSolution(a: CountSolution, b: CountSolution): boolean {
  if (a.kind !== b.kind) return false
  return a.kind === 'circle' && b.kind === 'circle'
    ? a.circleId === b.circleId
    : a.kind === 'polygon' && b.kind === 'polygon' && sameBoundary(a.vertices, b.vertices)
}
