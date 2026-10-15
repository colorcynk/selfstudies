import type { CatalogEntry } from './catalog'

/** Stable stage and reward IDs for the geometry games. */
export const GEOMETRY_CATALOG: readonly CatalogEntry[] = [
  { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-circle', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-circle' } },
  { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-square', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-square' } },
  { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-rectangle', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-rectangle' } },
  { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-equilateral', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-equilateral' } },
  { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-isosceles', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-isosceles' } },
  { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-right-triangle', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-right-triangle' } },
  { appId: 'geometry', modeId: 'geometry-count', stageId: 'geometry:count-intro', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-count-intro' } },
  { appId: 'geometry', modeId: 'geometry-count', stageId: 'geometry:count-composite', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-count-composite' } },
  { appId: 'geometry', modeId: 'geometry-count', stageId: 'geometry:count-mixed', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-count-mixed' } },
]
