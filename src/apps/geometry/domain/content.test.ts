import { describe, expect, it } from 'vitest'
import { classifyShape, isSameSizeAndShape, validateShape } from './geometry'
import { validateCountQuestion, validateMatchQuestion } from './validate'
import { enumeratePolygons, sameSolution } from './enumerate'
import { MATCH_VIEWBOX, MATCH_QUESTIONS } from '../data/match'
import { GEOMETRY_STAGES, getGeometryStage } from '../data'
import { COUNT_QUESTIONS } from '../data/count'
import { GEOMETRY_CATALOG } from '../../../shared/progress/geometryCatalog'

const expectedStages = [
  'geometry:match-circle', 'geometry:match-square', 'geometry:match-rectangle',
  'geometry:match-equilateral', 'geometry:match-isosceles', 'geometry:match-right-triangle',
]
const expectedAnswerSlots = [
  [0, 1, 2, 3, 0], [1, 2, 3, 0, 1], [2, 3, 0, 1, 2],
  [3, 0, 1, 2, 3], [0, 1, 2, 3, 0], [1, 2, 3, 0, 1],
]
const kinds = ['circle', 'square', 'rectangle', 'equilateral', 'isosceles', 'right-triangle'] as const

function insideFrame(shape: (typeof MATCH_QUESTIONS)[number]['example']): boolean {
  if (shape.kind === 'circle') return shape.center.x - shape.radius >= MATCH_VIEWBOX.minX
    && shape.center.x + shape.radius <= MATCH_VIEWBOX.maxX
    && shape.center.y - shape.radius >= MATCH_VIEWBOX.minY
    && shape.center.y + shape.radius <= MATCH_VIEWBOX.maxY
  return shape.vertices.every((point) => point.x >= MATCH_VIEWBOX.minX && point.x <= MATCH_VIEWBOX.maxX
    && point.y >= MATCH_VIEWBOX.minY && point.y <= MATCH_VIEWBOX.maxY)
}

function sameShapeAtDifferentSize(example: (typeof MATCH_QUESTIONS)[number]['example'], candidate: (typeof MATCH_QUESTIONS)[number]['example']): boolean {
  if (example.kind !== candidate.kind) return false
  if (example.kind === 'circle' && candidate.kind === 'circle') return candidate.radius !== example.radius
  if (example.kind !== 'polygon' || candidate.kind !== 'polygon' || example.vertices.length !== candidate.vertices.length) return false
  const lengths = (vertices: typeof example.vertices) => vertices.map((point, index) => {
    const next = vertices[(index + 1) % vertices.length]
    return Math.hypot(next.x - point.x, next.y - point.y)
  })
  const a = lengths(example.vertices), b = lengths(candidate.vertices)
  const ratio = b[0] / a[0]
  return Math.abs(ratio - 1) > .1 && a.every((length, index) => Math.abs(b[index] / length - ratio) < 1e-6)
}

describe('fixed geometry match content', () => {
  it('provides six manifest-ordered stages and exactly five fixed questions per stage', () => {
    expect(GEOMETRY_STAGES.map((stage) => stage.id)).toEqual([...expectedStages, 'geometry:count-intro', 'geometry:count-composite', 'geometry:count-mixed'])
    expect(GEOMETRY_STAGES.map((stage) => stage.id)).toEqual(GEOMETRY_CATALOG.map((entry) => entry.stageId))
    expect(getGeometryStage('missing')).toBeUndefined()
    for (const stage of GEOMETRY_STAGES) {
      expect(stage.questions).toHaveLength(5)
      expect(stage.questions.every((question) => question.stageId === stage.id)).toBe(true)
      expect(stage.mode).toBe(stage.id.includes(':count-') ? 'count' : 'match')
      expect(stage.title).toBeTruthy()
      expect(stage.description).toBeTruthy()
      expect(stage.cardDescription).toBeTruthy()
      expect(getGeometryStage(stage.id)).toBe(stage)
      const manifestEntry = GEOMETRY_CATALOG.find((entry) => entry.stageId === stage.id)!
      expect(manifestEntry.modeId).toBe(stage.mode === 'match' ? 'geometry-match' : 'geometry-count')
      expect(manifestEntry.questionCount).toBe(stage.questions.length)
    }
    expect(MATCH_QUESTIONS).toHaveLength(30)
    expect(new Set(MATCH_QUESTIONS.map((question) => question.id)).size).toBe(30)
    const allQuestions = [...MATCH_QUESTIONS, ...COUNT_QUESTIONS]
    expect(allQuestions).toHaveLength(45)
    expect(new Set(allQuestions.map((question) => question.id)).size).toBe(45)
  })

  it('validates every candidate, independently checks congruence, scale distractors, classifications, and frame bounds', () => {
    for (let stageIndex = 0; stageIndex < GEOMETRY_STAGES.length; stageIndex += 1) {
      const stage = GEOMETRY_STAGES[stageIndex]
      if (stage.mode !== 'match') continue
      for (let questionIndex = 0; questionIndex < stage.questions.length; questionIndex += 1) {
        const question = stage.questions[questionIndex]
        validateMatchQuestion(question)
        expect(question.candidates).toHaveLength(4)
        expect(question.candidates[expectedAnswerSlots[stageIndex][questionIndex]].id).toBe(question.answerId)
        const answers = question.candidates.filter((candidate) => isSameSizeAndShape(question.example, candidate.shape))
        expect(answers.map((candidate) => candidate.id)).toEqual([question.answerId])
        expect(question.candidates.some((candidate) => candidate.id !== question.answerId
          && sameShapeAtDifferentSize(question.example, candidate.shape))).toBe(true)
        expect(insideFrame(question.example)).toBe(true)
        expect(classifyShape(question.example).has(kinds[stageIndex])).toBe(true)
        for (const candidate of question.candidates) {
          validateShape(candidate.shape)
          expect(insideFrame(candidate.shape)).toBe(true)
          expect(classifyShape(candidate.shape).has(kinds[stageIndex])).toBe(true)
        }
        if (stageIndex === 2) expect(classifyShape(question.example).has('square')).toBe(false)
        if (stageIndex === 4) expect(classifyShape(question.example).has('equilateral')).toBe(false)
        if (stageIndex > 0) {
          const answer = question.candidates.find((candidate) => candidate.id === question.answerId)!
          expect(answer.shape.kind).toBe('polygon')
          expect(isSameSizeAndShape(question.example, answer.shape)).toBe(true)
          // Compare first-edge directions so translation cannot masquerade as a rotation.
          const source = question.example.kind === 'polygon' ? question.example.vertices : []
          const target = answer.shape.kind === 'polygon' ? answer.shape.vertices : []
          const sourceAngle = Math.atan2(source[1].y - source[0].y, source[1].x - source[0].x)
          const targetAngle = Math.atan2(target[1].y - target[0].y, target[1].x - target[0].x)
          expect(Math.abs(Math.atan2(Math.sin(targetAngle - sourceAngle), Math.cos(targetAngle - sourceAngle)))).toBeGreaterThan(.05)
        }
      }
    }
  })

  it('validates every fixed count solution against independent contour enumeration and lesson coverage', () => {
    expect(COUNT_QUESTIONS).toHaveLength(15)
    expect(new Set(COUNT_QUESTIONS.map((question) => question.id)).size).toBe(15)
    const targets = new Set(COUNT_QUESTIONS.map((question) => question.targetKind))
    expect(targets).toEqual(new Set(kinds))
    for (const stageId of ['geometry:count-intro', 'geometry:count-composite', 'geometry:count-mixed']) {
      const stageQuestions = COUNT_QUESTIONS.filter((question) => question.stageId === stageId)
      expect(stageQuestions).toHaveLength(5)
      expect(stageQuestions.some((question) => question.targetKind === 'square' || question.targetKind === 'rectangle')).toBe(true)
      expect(stageQuestions.some((question) => ['equilateral', 'isosceles', 'right-triangle'].includes(question.targetKind))).toBe(true)
    }
    expect(COUNT_QUESTIONS.some((question) => question.solutions.length === 0)).toBe(true)
    expect(COUNT_QUESTIONS.some((question) => question.diagram.circles?.length)).toBe(true)
    const positiveCircleQuestion = COUNT_QUESTIONS.find((question) => question.id === 'geometry:count-intro:q05')!
    expect(positiveCircleQuestion.solutions).toEqual([{ kind: 'circle', circleId: 'c1' }])
    expect(COUNT_QUESTIONS.find((question) => question.id === 'geometry:count-intro:q02')?.solutions).toHaveLength(0)
    expect(COUNT_QUESTIONS.some((question) => question.diagram.segments.some((segment) => segment.id.includes('diagonal')))).toBe(true)
    expect(COUNT_QUESTIONS.some((question) => question.id === 'geometry:count-composite:q01' && question.solutions.length === 5)).toBe(true)
    const rotatedSquare = COUNT_QUESTIONS.find((question) => question.id === 'geometry:count-mixed:q05')!.solutions[0]
    expect(rotatedSquare.kind).toBe('polygon')
    if (rotatedSquare.kind === 'polygon') expect(classifyShape({ kind: 'polygon', vertices: rotatedSquare.vertices }).has('square')).toBe(true)
    for (const question of COUNT_QUESTIONS) {
      validateCountQuestion(question)
      const enumerated = enumeratePolygons(question.diagram)
      for (const solution of question.solutions) expect(enumerated.some((candidate) => sameSolution(candidate, solution)) || solution.kind === 'circle').toBe(true)
      expect(question.breakdown.reduce((sum, item) => sum + item.count, 0)).toBe(question.solutions.length)
      expect(question.breakdown.every((item) => item.label.length > 0 && item.count >= 0)).toBe(true)
    }
    for (const question of COUNT_QUESTIONS) {
      expect(question.hint).not.toMatch(/(?:答え|合計|合わせて).{0,8}[0-9０-９一二三四五六七八九十]+個/)
      expect(question.hint).not.toMatch(/[一二三四五六七八九十0-9０-９]+つの(?:形|図形|三角形|正方形|輪郭)/)
    }
    const overlapHintRules: Record<string, string[]> = {
      'geometry:count-intro:q04': ['正三角形も二等辺', '直角二等辺は直角と二等辺の両方'],
      'geometry:count-composite:q02': ['正方形も長方形'],
      'geometry:count-mixed:q03': ['正方形も長方形'],
      'geometry:count-composite:q03': ['直角二等辺三角形も直角三角形として数える'],
      'geometry:count-mixed:q02': ['直角二等辺三角形も直角三角形として数える'],
      'geometry:count-composite:q05': ['直角二等辺三角形も二等辺三角形として数える'],
      'geometry:count-mixed:q04': ['直角二等辺三角形も二等辺三角形として数える'],
    }
    for (const [id, requiredRules] of Object.entries(overlapHintRules)) {
      const question = COUNT_QUESTIONS.find((item) => item.id === id)!
      for (const requiredRule of requiredRules) expect(question.hint).toContain(requiredRule)
    }
    for (const stage of GEOMETRY_STAGES.filter((item) => item.mode === 'count')) {
      expect(stage.description).toContain('正方形は長方形')
      expect(stage.description).toContain('正三角形は二等辺三角形')
      expect(stage.description).toContain('直角二等辺三角形は直角三角形')
    }
  })
})
