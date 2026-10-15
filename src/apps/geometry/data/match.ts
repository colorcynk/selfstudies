import type { MatchQuestion, Point, Shape } from '../domain/types'

/** Shared teaching-coordinate frame; renderers must preserve this scale for every shape. */
export const MATCH_VIEWBOX = { minX: -6, maxX: 6, minY: -6, maxY: 6 } as const

type PolygonTuple = readonly [number, number][]
interface AuthoredQuestion {
  id: string
  example: Shape
  answerSlot: number
  angle: number
  sizeScales: readonly [number, number, number]
}

const polygon = (vertices: PolygonTuple): Shape => ({ kind: 'polygon', vertices: vertices.map(([x, y]) => ({ x, y })) })
const authored: AuthoredQuestion[][] = [
  [
    { id: 'geometry:match-circle:q01', example: { kind: 'circle', center: { x: 0, y: 0 }, radius: 1.1 }, answerSlot: 0, angle: 0, sizeScales: [.62, .82, 1.24] },
    { id: 'geometry:match-circle:q02', example: { kind: 'circle', center: { x: 0, y: 0 }, radius: 1.25 }, answerSlot: 1, angle: 0, sizeScales: [.65, .84, 1.22] },
    { id: 'geometry:match-circle:q03', example: { kind: 'circle', center: { x: 0, y: 0 }, radius: 1.4 }, answerSlot: 2, angle: 0, sizeScales: [.64, .83, 1.2] },
    { id: 'geometry:match-circle:q04', example: { kind: 'circle', center: { x: 0, y: 0 }, radius: 1.05 }, answerSlot: 3, angle: 0, sizeScales: [.61, .81, 1.25] },
    { id: 'geometry:match-circle:q05', example: { kind: 'circle', center: { x: 0, y: 0 }, radius: 1.3 }, answerSlot: 0, angle: 0, sizeScales: [.63, .85, 1.23] },
  ],
  [
    { id: 'geometry:match-square:q01', example: polygon([[-1,-1],[1,-1],[1,1],[-1,1]]), answerSlot: 1, angle: Math.PI / 4, sizeScales: [.62,.82,1.24] },
    { id: 'geometry:match-square:q02', example: polygon([[-1.2,-1.2],[1.2,-1.2],[1.2,1.2],[-1.2,1.2]]), answerSlot: 2, angle: Math.PI / 6, sizeScales: [.65,.84,1.22] },
    { id: 'geometry:match-square:q03', example: polygon([[-.9,-.9],[.9,-.9],[.9,.9],[-.9,.9]]), answerSlot: 3, angle: Math.PI / 3, sizeScales: [.64,.83,1.2] },
    { id: 'geometry:match-square:q04', example: polygon([[-1.1,-1.1],[1.1,-1.1],[1.1,1.1],[-1.1,1.1]]), answerSlot: 0, angle: Math.PI / 5, sizeScales: [.61,.81,1.25] },
    { id: 'geometry:match-square:q05', example: polygon([[-1.3,-1.3],[1.3,-1.3],[1.3,1.3],[-1.3,1.3]]), answerSlot: 1, angle: Math.PI / 8, sizeScales: [.63,.85,1.23] },
  ],
  [
    { id: 'geometry:match-rectangle:q01', example: polygon([[-1.5,-.8],[1.5,-.8],[1.5,.8],[-1.5,.8]]), answerSlot: 2, angle: Math.PI / 5, sizeScales: [.62,.82,1.24] },
    { id: 'geometry:match-rectangle:q02', example: polygon([[-1.7,-.9],[1.7,-.9],[1.7,.9],[-1.7,.9]]), answerSlot: 3, angle: Math.PI / 4, sizeScales: [.65,.84,1.22] },
    { id: 'geometry:match-rectangle:q03', example: polygon([[-1.4,-.7],[1.4,-.7],[1.4,.7],[-1.4,.7]]), answerSlot: 0, angle: Math.PI / 6, sizeScales: [.64,.83,1.2] },
    { id: 'geometry:match-rectangle:q04', example: polygon([[-1.6,-.75],[1.6,-.75],[1.6,.75],[-1.6,.75]]), answerSlot: 1, angle: Math.PI / 3, sizeScales: [.61,.81,1.25] },
    { id: 'geometry:match-rectangle:q05', example: polygon([[-1.8,-1],[1.8,-1],[1.8,1],[-1.8,1]]), answerSlot: 2, angle: Math.PI / 7, sizeScales: [.63,.85,1.23] },
  ],
  [
    { id: 'geometry:match-equilateral:q01', example: polygon([[-1,-.577350269189626],[1,-.577350269189626],[0,1.154700538379252]]), answerSlot: 3, angle: Math.PI / 5, sizeScales: [.62,.82,1.24] },
    { id: 'geometry:match-equilateral:q02', example: polygon([[-1.2,-.692820323027551],[1.2,-.692820323027551],[0,1.385640646055102]]), answerSlot: 0, angle: Math.PI / 4, sizeScales: [.65,.84,1.22] },
    { id: 'geometry:match-equilateral:q03', example: polygon([[-.9,-.519615242270663],[.9,-.519615242270663],[0,1.039230484541326]]), answerSlot: 1, angle: Math.PI / 6, sizeScales: [.64,.83,1.2] },
    { id: 'geometry:match-equilateral:q04', example: polygon([[-1.1,-.635085296108588],[1.1,-.635085296108588],[0,1.270170592217176]]), answerSlot: 2, angle: Math.PI / 3, sizeScales: [.61,.81,1.25] },
    { id: 'geometry:match-equilateral:q05', example: polygon([[-1.3,-.750555349946514],[1.3,-.750555349946514],[0,1.501110699893028]]), answerSlot: 3, angle: Math.PI / 8, sizeScales: [.63,.85,1.23] },
  ],
  [
    { id: 'geometry:match-isosceles:q01', example: polygon([[-1,-.7],[1,-.7],[0,1]]), answerSlot: 0, angle: Math.PI / 5, sizeScales: [.62,.82,1.24] },
    { id: 'geometry:match-isosceles:q02', example: polygon([[-1.2,-.8],[1.2,-.8],[0,1.1]]), answerSlot: 1, angle: Math.PI / 4, sizeScales: [.65,.84,1.22] },
    { id: 'geometry:match-isosceles:q03', example: polygon([[-.9,-.6],[.9,-.6],[0,1]]), answerSlot: 2, angle: Math.PI / 6, sizeScales: [.64,.83,1.2] },
    { id: 'geometry:match-isosceles:q04', example: polygon([[-1.1,-.75],[1.1,-.75],[0,1.05]]), answerSlot: 3, angle: Math.PI / 3, sizeScales: [.61,.81,1.25] },
    { id: 'geometry:match-isosceles:q05', example: polygon([[-1.3,-.85],[1.3,-.85],[0,1.2]]), answerSlot: 0, angle: Math.PI / 7, sizeScales: [.63,.85,1.23] },
  ],
  [
    { id: 'geometry:match-right-triangle:q01', example: polygon([[-1,-1],[1,-1],[-1,1]]), answerSlot: 1, angle: Math.PI / 5, sizeScales: [.62,.82,1.24] },
    { id: 'geometry:match-right-triangle:q02', example: polygon([[-1.2,-.8],[1.2,-.8],[-1.2,.8]]), answerSlot: 2, angle: Math.PI / 4, sizeScales: [.65,.84,1.22] },
    { id: 'geometry:match-right-triangle:q03', example: polygon([[-.9,-.9],[.9,-.9],[-.9,.9]]), answerSlot: 3, angle: Math.PI / 6, sizeScales: [.64,.83,1.2] },
    { id: 'geometry:match-right-triangle:q04', example: polygon([[-1.1,-.7],[1.1,-.7],[-1.1,.7]]), answerSlot: 0, angle: Math.PI / 3, sizeScales: [.61,.81,1.25] },
    { id: 'geometry:match-right-triangle:q05', example: polygon([[-1.3,-.9],[1.3,-.9],[-1.3,.9]]), answerSlot: 1, angle: Math.PI / 8, sizeScales: [.63,.85,1.23] },
  ],
]

function transformed(shape: Shape, scale: number, angle: number, center: Point): Shape {
  if (shape.kind === 'circle') return { kind: 'circle', center, radius: shape.radius * scale }
  const cx = shape.vertices.reduce((sum, p) => sum + p.x / shape.vertices.length, 0)
  const cy = shape.vertices.reduce((sum, p) => sum + p.y / shape.vertices.length, 0)
  const c = Math.cos(angle), s = Math.sin(angle)
  return { kind: 'polygon', vertices: shape.vertices.map((p) => {
    const x = (p.x - cx) * scale, y = (p.y - cy) * scale
    return { x: center.x + c * x - s * y, y: center.y + s * x + c * y }
  }) }
}

const anchors = [-3.2, -1.1, 1.1, 3.2]
export const MATCH_QUESTIONS: readonly MatchQuestion[] = authored.flatMap((stage, stageIndex) => stage.map((item, questionIndex) => {
  let scaleIndex = 0
  const candidates = [0, 1, 2, 3].map((slot) => {
    const correct = slot === item.answerSlot
    const scale = correct ? 1 : item.sizeScales[scaleIndex++]
    const angle = item.example.kind === 'circle' ? 0 : item.angle + slot * Math.PI / 11
    const shape = transformed(item.example, scale, angle, { x: anchors[slot], y: questionIndex % 2 ? .3 : -.3 })
    return { id: `option-${item.id}-${slot + 1}`, shape }
  })
  return {
    id: item.id,
    stageId: item.id.slice(0, item.id.lastIndexOf(':')),
    mode: 'match' as const,
    example: item.example,
    candidates,
    answerId: candidates[item.answerSlot].id,
    hint: ['円のふちまでの長さを見くらべよう。', '4つの辺の長さと角を見くらべよう。', '向かい合う辺と4つの直角を見よう。', '3つの辺が同じ長さか見よう。', '同じ長さの辺が2つあるか見よう。', '直角のある場所を見つけよう。'][stageIndex],
    explanation: [
      '円は、まん中からふちまでの長さ（半径）がどこでも同じです。見本と半径が同じ円を選びます。',
      '正方形は4つの辺が同じ長さで、4つの角が直角です。向きが回っていても、同じ大きさなら重ねられます。',
      '長方形は向かい合う辺が同じ長さで、4つの角が直角です。見本とたて横の長さが同じものを選びます。',
      '正三角形は3つの辺がすべて同じ長さです。回転していても辺の長さが同じなら重ねられます。',
      '二等辺三角形は少なくとも2つの辺が同じ長さです。この見本は正三角形ではなく、同じ大きさで回転したものを選びます。',
      '直角三角形は直角を1つ持ちます。向きが違っても、辺の長さが見本と同じなら重ねられます。',
    ][stageIndex],
  }
}))
