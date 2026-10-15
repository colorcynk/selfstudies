import type { CountQuestion, CountSolution, MatchQuestion, Point, ShapeKind } from './types'
import { classifyShape, isSameSizeAndShape, nearlyEqual, validateShape } from './geometry'
import { DiagramError, enumeratePolygons, sameSolution } from './enumerate'

export class QuestionValidationError extends Error {
  constructor(public readonly id: string, message: string) { super(message); this.name = 'QuestionValidationError' }
}

function fail(id: string, message: string): never { throw new QuestionValidationError(id, message) }

export function validateMatchQuestion(question: MatchQuestion): void {
  if (!question.id || !question.stageId || question.mode !== 'match' || !question.hint || !question.explanation) fail('match.invalid_question', 'Question metadata is incomplete')
  try { validateShape(question.example) } catch { fail('match.invalid_example', 'The example shape is invalid') }
  if (!Array.isArray(question.candidates) || question.candidates.length !== 4) fail('match.candidate_count', 'A match question must have exactly four candidates')
  const ids = new Set<string>()
  let correct = 0
  for (const candidate of question.candidates) {
    if (!candidate.id || ids.has(candidate.id)) fail('match.duplicate_candidate_id', 'Candidate IDs must be unique and non-empty')
    ids.add(candidate.id)
    try { validateShape(candidate.shape) } catch { fail('match.invalid_candidate', `Candidate ${candidate.id} is invalid`) }
    if (isSameSizeAndShape(question.example, candidate.shape)) correct += 1
  }
  if (!ids.has(question.answerId)) fail('match.invalid_answer_id', 'Answer ID must name a candidate')
  if (correct !== 1) fail('match.non_unique_correct_candidate', 'Exactly one candidate must be congruent to the example')
  const answer = question.candidates.find((item) => item.id === question.answerId)!
  if (!isSameSizeAndShape(question.example, answer.shape)) fail('match.answer_mismatch', 'The named answer is not congruent to the example')
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy })
}

function validateCircles(question: CountQuestion): CountSolution[] {
  const circles = question.diagram.circles ?? []
  const ids = new Set<string>()
  const result: CountSolution[] = []
  for (const circle of circles) {
    if (!circle.id || ids.has(circle.id)) fail('count.duplicate_circle_id', 'Circle IDs must be unique and non-empty')
    ids.add(circle.id)
    try { validateShape({ kind: 'circle', center: circle.center, radius: circle.radius }) } catch { fail('count.invalid_circle', `Circle ${circle.id} must have a finite positive radius and valid coordinates`) }
    for (const segment of question.diagram.segments) {
      if (nearlyEqual(pointSegmentDistance(circle.center, segment.start.point, segment.end.point), circle.radius)) fail('count.circle_touches_line', `Circle ${circle.id} touches a line contour`)
      if (pointSegmentDistance(circle.center, segment.start.point, segment.end.point) < circle.radius) fail('count.circle_intersects_line', `Circle ${circle.id} intersects a line contour`)
    }
    for (const prior of circles.slice(0, result.length)) {
      const d = dist(circle.center, prior.center)
      if (d <= Math.abs(circle.radius - prior.radius) || nearlyEqual(d, Math.abs(circle.radius - prior.radius)) || d <= circle.radius + prior.radius || nearlyEqual(d, circle.radius + prior.radius)) fail('count.circles_touch_or_overlap', 'Circles must be separate and non-overlapping')
    }
    result.push({ kind: 'circle', circleId: circle.id })
  }
  return result
}

function matchesKind(solution: CountSolution, kind: ShapeKind, circleIds: Set<string>): boolean {
  if (solution.kind === 'circle') return kind === 'circle' && circleIds.has(solution.circleId)
  if (kind === 'circle') return false
  try { return classifyShape({ kind: 'polygon', vertices: solution.vertices }).has(kind) } catch { return false }
}

export function validateCountQuestion(question: CountQuestion): void {
  if (!question.id || !question.stageId || question.mode !== 'count' || !question.hint || !question.explanation) fail('count.invalid_question', 'Question metadata is incomplete')
  if (!Array.isArray(question.solutions)) fail('count.invalid_solutions', 'Solutions must be an array')
  if (!Array.isArray(question.breakdown)) fail('count.invalid_breakdown', 'Breakdown must be an array')
  const supported: ShapeKind[] = ['circle', 'square', 'rectangle', 'equilateral', 'isosceles', 'right-triangle']
  if (!supported.includes(question.targetKind)) fail('count.invalid_target_kind', 'Target kind is unsupported')
  let polygons: CountSolution[]
  try { polygons = enumeratePolygons(question.diagram) } catch (error) {
    if (error instanceof DiagramError) fail(error.id, error.message)
    throw error
  }
  // Every triangle in the diagram must be within the lesson's permitted scope,
  // even when the requested answer is circles or quadrilaterals.
  for (const polygon of polygons) {
    if (polygon.kind !== 'polygon' || polygon.vertices.length !== 3) continue
    const kinds = classifyShape({ kind: 'polygon', vertices: polygon.vertices })
    if (!kinds.has('isosceles') && !kinds.has('equilateral') && !kinds.has('right-triangle')) fail('count.out_of_scope_triangle', 'Every triangle must be isosceles, equilateral, or right')
  }
  const circles = validateCircles(question)
  const all = [...polygons, ...circles]
  const target = all.filter((solution) => matchesKind(solution, question.targetKind, new Set(circles.map((s) => s.kind === 'circle' ? s.circleId : ''))))
  for (const solution of question.solutions) {
    if (!solution || (solution.kind !== 'polygon' && solution.kind !== 'circle')) fail('count.invalid_solution', 'Each solution must be a polygon or circle')
    if (solution.kind === 'polygon') {
      try { validateShape({ kind: 'polygon', vertices: solution.vertices }) } catch { fail('count.invalid_solution', 'Solution polygons must be valid convex contours') }
    } else if (typeof solution.circleId !== 'string' || !solution.circleId) fail('count.invalid_solution', 'Circle solutions must name a circle ID')
  }
  for (let i = 0; i < question.solutions.length; i += 1) {
    if (question.solutions.slice(i + 1).some((solution) => sameSolution(question.solutions[i], solution))) fail('count.duplicate_solution', 'Solutions must not contain duplicates')
  }
  const unmatched = [...target]
  for (const solution of question.solutions) {
    const index = unmatched.findIndex((expected) => sameSolution(solution, expected))
    if (index < 0) fail('count.solution_set_mismatch', 'Solutions must exactly match every target contour in the diagram')
    unmatched.splice(index, 1)
  }
  if (unmatched.length) fail('count.solution_set_mismatch', 'Solutions must exactly match every target contour in the diagram')
  if (question.solutions.length > 20) fail('count.too_many_solutions', 'A count question may have at most 20 answers')
  const breakdownIds = new Set<string>()
  for (const item of question.breakdown) {
    if (!item.id || !item.label || breakdownIds.has(item.id) || !Number.isInteger(item.count) || item.count < 0) fail('count.invalid_breakdown', 'Breakdown entries need unique IDs, labels, and non-negative integer counts')
    breakdownIds.add(item.id)
  }
  if (question.breakdown.reduce((sum, item) => sum + item.count, 0) !== question.solutions.length) fail('count.breakdown_mismatch', 'Breakdown counts must sum to the number of solutions')
}
