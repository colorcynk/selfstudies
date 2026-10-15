import type { CountQuestion, CountSolution, Point } from '../domain/types'

function solutionPoints(solution: CountSolution): Point[] | undefined {
  if (solution.kind === 'polygon') return solution.vertices
  return undefined
}

export function CountDiagram({ question, solutionIndex, showSolutions = false }: {
  question: CountQuestion
  solutionIndex?: number
  /** Must remain false before the answer is correct. */
  showSolutions?: boolean
}) {
  const points = question.diagram.segments.flatMap(({ start, end }) => [start.point, end.point])
  for (const circle of question.diagram.circles ?? []) points.push({ x: circle.center.x - circle.radius, y: circle.center.y - circle.radius }, { x: circle.center.x + circle.radius, y: circle.center.y + circle.radius })
  const minX = Math.min(...points.map((p) => p.x), 0), maxX = Math.max(...points.map((p) => p.x), 0)
  const minY = Math.min(...points.map((p) => p.y), 0), maxY = Math.max(...points.map((p) => p.y), 0)
  const pad = Math.max(0.5, Math.max(maxX - minX, maxY - minY) * 0.08)
  const viewBox = `${minX - pad} ${-maxY - pad} ${Math.max(1, maxX - minX + 2 * pad)} ${Math.max(1, maxY - minY + 2 * pad)}`
  const selected = showSolutions && solutionIndex !== undefined ? question.solutions[solutionIndex] : undefined
  const selectedVertices = selected && solutionPoints(selected)
  const circleById = new Map((question.diagram.circles ?? []).map((circle) => [circle.id, circle]))
  const selectedCircle = selected?.kind === 'circle' ? circleById.get(selected.circleId) : undefined
  const selectedPath = selectedVertices?.map(({ x, y }) => `${x},${-y}`).join(' ')
  const selectedLabel = selected ? `数えた輪郭 ${solutionIndex! + 1}` : undefined
  return <svg className="geometry-count-diagram" viewBox={viewBox} role="img" aria-label={selectedLabel ?? '図の線と輪郭'} preserveAspectRatio="xMidYMid meet">
    <g className="geometry-count-lines">{question.diagram.segments.map((edge) => <line key={edge.id} x1={edge.start.point.x} y1={-edge.start.point.y} x2={edge.end.point.x} y2={-edge.end.point.y} />)}</g>
    {(question.diagram.circles ?? []).map((circle) => <circle key={circle.id} cx={circle.center.x} cy={-circle.center.y} r={circle.radius} />)}
    {selectedPath && <polygon className="geometry-count-selected" points={selectedPath} />}
    {selectedCircle && <circle className="geometry-count-selected" cx={selectedCircle.center.x} cy={-selectedCircle.center.y} r={selectedCircle.radius} />}
    {selectedVertices && <g className="geometry-count-number"><circle cx={selectedVertices.reduce((sum, p) => sum + p.x / selectedVertices.length, 0)} cy={-selectedVertices.reduce((sum, p) => sum + p.y / selectedVertices.length, 0)} r={pad * 0.45} /><text x={selectedVertices.reduce((sum, p) => sum + p.x / selectedVertices.length, 0)} y={-selectedVertices.reduce((sum, p) => sum + p.y / selectedVertices.length, 0)} dy=".35em">{solutionIndex! + 1}</text></g>}
    {selectedCircle && <g className="geometry-count-number"><circle cx={selectedCircle.center.x} cy={-selectedCircle.center.y} r={pad * 0.45} /><text x={selectedCircle.center.x} y={-selectedCircle.center.y} dy=".35em">{solutionIndex! + 1}</text></g>}
  </svg>
}
