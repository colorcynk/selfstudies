import { getCongruenceTransform } from '../domain/geometry'
import type { MatchQuestion, Point, Shape, ShapeKind } from '../domain/types'

const names: Record<ShapeKind, string> = {
  circle: 'まる', square: 'せいほうけい', rectangle: 'ちょうほうけい',
  equilateral: 'せいさんかくけい', isosceles: 'にとうへんさんかくけい', 'right-triangle': 'ちょっかくさんかくけい',
}
const features: Record<ShapeKind, string> = {
  circle: 'まん中からふちまでの長さは、どの向きでも同じです。',
  square: '4つの辺は同じ長さで、4つの角は直角です。',
  rectangle: '4つの角が直角で、向かい合う辺は同じ長さです。',
  equilateral: '3つの辺はすべて同じ長さです。',
  isosceles: '少なくとも2つの辺が同じ長さです。',
  'right-triangle': '1つの角が直角です。',
}

function move(source: Shape, rotation: number, translation: Point): Shape {
  const c = Math.cos(rotation), s = Math.sin(rotation)
  const point = (p: Point): Point => ({ x: c * p.x - s * p.y + translation.x, y: s * p.x + c * p.y + translation.y })
  return source.kind === 'circle'
    ? { ...source, center: point(source.center) }
    : { ...source, vertices: source.vertices.map(point) }
}

function Overlay({ question }: { question: MatchQuestion }) {
  const candidate = question.candidates.find((option) => option.id === question.answerId)?.shape
  if (!candidate) return null
  const transform = getCongruenceTransform(candidate, question.example)
  if (!transform) return null
  const aligned = move(candidate, transform.rotation, transform.translation)
  const render = (shape: Shape, className: string) => shape.kind === 'circle'
    ? <circle className={className} cx={shape.center.x} cy={-shape.center.y} r={shape.radius} />
    : <polygon className={className} points={shape.vertices.map(({ x, y }) => `${x},${-y}`).join(' ')} />
  return <svg className="geometry-shape geometry-match-overlay" viewBox="-6 -6 12 12" role="img" aria-label="候補を回して見本に重ねた図" preserveAspectRatio="xMidYMid meet">
    {render(question.example, 'geometry-overlay-target')}{render(aligned, 'geometry-overlay-source')}
  </svg>
}

function FeatureMark({ shape }: { shape: Shape }) {
  if (shape.kind === 'circle') return <svg className="geometry-feature-mark" viewBox="-2 -2 4 4" role="img" aria-label="まん中から円のふちまでの同じ長さを示す図">
    <circle className="geometry-feature-circle" cx="0" cy="0" r="1.2" />
    <circle className="geometry-feature-center" cx="0" cy="0" r=".055" />
    <path d="M 0 0 L 1.2 0 M 0 0 L 0 -1.2" />
    <path className="geometry-feature-radius-mark" d="M .6 -.09 L .6 .09 M -.09 -.6 L .09 -.6" />
  </svg>
  const pts = shape.vertices
  const lengths = pts.map((point, i) => Math.hypot(pts[(i + 1) % pts.length].x - point.x, pts[(i + 1) % pts.length].y - point.y))
  const edgeGroups: number[][] = []
  lengths.forEach((length, i) => {
    let group = edgeGroups.find((indices) => Math.abs(length - lengths[indices[0]]) < 1e-5 * Math.max(1, length))
    if (!group) { group = []; edgeGroups.push(group) }
    group.push(i)
  })
  const markedEdges = edgeGroups.filter((group) => group.length > 1).flat()
  const edgeMark = (i: number, groupNumber: number) => {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    const dx = b.x - a.x, dy = -(b.y - a.y), length = Math.hypot(dx, dy) || 1
    const mx = (a.x + b.x) / 2, my = -(a.y + b.y) / 2
    const nx = -dy / length, ny = dx / length
    return <path key={i} d={Array.from({ length: groupNumber + 1 }, (_, mark) => {
      const offset = (mark - groupNumber / 2) * .13
      const cx = mx + dx / length * offset, cy = my + dy / length * offset
      return `M ${cx - nx * .13} ${cy - ny * .13} L ${cx + nx * .13} ${cy + ny * .13}`
    }).join(' ')} />
  }
  const rightCorners = pts.map((p, i) => {
    const before = pts[(i + pts.length - 1) % pts.length], after = pts[(i + 1) % pts.length]
    const ax = before.x - p.x, ay = before.y - p.y, bx = after.x - p.x, by = after.y - p.y
    return Math.abs(ax * bx + ay * by) < 1e-6 ? i : -1
  }).filter((i) => i >= 0)
  const rightMark = (i: number) => {
    const p = pts[i], before = pts[(i + pts.length - 1) % pts.length], after = pts[(i + 1) % pts.length]
    const norm = (v: Point) => { const l = Math.hypot(v.x, v.y) || 1; return { x: v.x / l, y: -v.y / l } }
    const u = norm({ x: before.x - p.x, y: before.y - p.y }), v = norm({ x: after.x - p.x, y: after.y - p.y }), size = .22
    return <path key={i} d={`M ${p.x + u.x * size} ${-p.y + u.y * size} L ${p.x + (u.x + v.x) * size} ${-p.y + (u.y + v.y) * size} L ${p.x + v.x * size} ${-p.y + v.y * size}`} />
  }
  const kind = shape.vertices.length === 4 ? '四角形' : '三角形'
  return <svg className="geometry-feature-mark" viewBox="-3 -3 6 6" role="img" aria-label={`${kind}の辺と角を確かめる図`}>
    <polygon points={pts.map(({ x, y }) => `${x},${-y}`).join(' ')} />
    {markedEdges.map((i) => edgeMark(i, edgeGroups.findIndex((group) => group.includes(i)) ))}
    {rightCorners.map(rightMark)}
  </svg>
}

export function MatchExplanation({ question, shapeKind, stageDescription }: {
  question: MatchQuestion
  shapeKind: ShapeKind
  stageDescription?: string
}) {
  return <section className="geometry-explanation" aria-labelledby="geometry-match-explanation-title">
    <h3 id="geometry-match-explanation-title">ぴったり かさなるよ</h3>
    <Overlay question={question} />
    <h4>{names[shapeKind]}</h4>
    <p>{features[shapeKind]}</p>
    <p>{question.explanation}</p>
    <FeatureMark shape={question.example} />
    {stageDescription && <p>{stageDescription}</p>}
  </section>
}
