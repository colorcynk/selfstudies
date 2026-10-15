import type { Shape } from '../domain/types'

/** A figure drawn in the common teaching frame used by every match option. */
export function ShapeFigure({ shape, label, className }: { shape: Shape; label: string; className?: string }) {
  return <svg className={['geometry-shape', className].filter(Boolean).join(' ')} viewBox="-6 -6 12 12" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
    {shape.kind === 'circle'
      ? <circle cx={shape.center.x} cy={-shape.center.y} r={shape.radius} />
      : <polygon points={shape.vertices.map(({ x, y }) => `${x},${-y}`).join(' ')} />}
  </svg>
}
