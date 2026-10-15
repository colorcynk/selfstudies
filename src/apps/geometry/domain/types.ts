export interface Point {
  x: number
  y: number
}

export interface Circle {
  kind: 'circle'
  center: Point
  radius: number
}

export interface Polygon {
  kind: 'polygon'
  vertices: Point[]
}

export type Shape = Circle | Polygon

export type ShapeKind =
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'equilateral'
  | 'isosceles'
  | 'right-triangle'

export interface CongruenceTransform {
  /** Counterclockwise angle, in radians, applied to the source shape. */
  rotation: number
  /** Translation applied after rotation. */
  translation: Point
  /** For polygons, source vertex index corresponding to each target vertex. */
  vertexMap?: number[]
}

/** A drawn straight segment. Endpoint IDs are stable across rendering and validation. */
export interface CountSegment {
  id: string
  start: { id: string; point: Point }
  end: { id: string; point: Point }
}

export interface CountCircle {
  id: string
  center: Point
  radius: number
}

export interface CountDiagram {
  segments: CountSegment[]
  circles?: CountCircle[]
}

export type CountSolution =
  | { kind: 'polygon'; vertices: Point[] }
  | { kind: 'circle'; circleId: string }

export interface GeometryQuestionBase {
  id: string
  stageId: string
  mode: 'match' | 'count'
  hint: string
  explanation: string
}

export interface MatchQuestion extends GeometryQuestionBase {
  mode: 'match'
  example: Shape
  candidates: { id: string; shape: Shape }[]
  answerId: string
}

export interface CountQuestion extends GeometryQuestionBase {
  mode: 'count'
  targetKind: ShapeKind
  diagram: CountDiagram
  solutions: CountSolution[]
  breakdown: { id: string; label: string; count: number }[]
}
