import type { AppId, CompletionRecord, ModeId, RewardKind } from './types'

export interface CatalogEntry {
  appId: AppId
  modeId: ModeId
  stageId: string
  questionCount: number
  reward?: { kind: RewardKind; id: string }
  calculation?: { operation: 'addition' | 'subtraction' | 'multiplication'; size: 10 | 25 | 100 }
}

export const CATALOG: readonly CatalogEntry[] = [
  ...Array.from({ length: 9 }, (_, i) => ({ appId: 'monsters' as const, modeId: 'kuku' as const, stageId: `monsters:dan-${i + 1}`, questionCount: 9, reward: { kind: 'monster' as const, id: `monster:dan-${i + 1}` } })),
  ...Array.from({ length: 4 }, (_, i) => ({ appId: 'shopping' as const, modeId: 'standard' as const, stageId: `shopping:quest-0${i + 1}`, questionCount: 2, reward: { kind: 'stamp' as const, id: `stamp:quest-0${i + 1}` } })),
  { appId: 'shopping', modeId: 'multiplication-count', stageId: 'shopping:quest-05', questionCount: 3, reward: { kind: 'stamp', id: 'stamp:quest-05' } },
  { appId: 'shopping', modeId: 'multiplication-money', stageId: 'shopping:quest-06', questionCount: 3, reward: { kind: 'stamp', id: 'stamp:quest-06' } },
  ...([
    [7, 'standard'], [8, 'standard'], [9, 'multiplication-count'],
    [10, 'multiplication-money'], [11, 'standard'], [12, 'multiplication-count'],
    [13, 'multiplication-money'], [14, 'multiplication-money'], [15, 'multiplication-count'],
  ] as const).map(([number, modeId]) => ({ appId: 'shopping' as const, modeId, stageId: `shopping:quest-${String(number).padStart(2, '0')}`, questionCount: modeId === 'standard' ? 2 : 3, reward: { kind: 'stamp' as const, id: `stamp:quest-${String(number).padStart(2, '0')}` } })),
  ...[2, 3].flatMap((grade) => Array.from({ length: 4 }, (_, i) => ({ appId: 'kanji' as const, modeId: 'standard' as const, stageId: `kanji:g${grade}-0${i + 1}`, questionCount: 5, reward: { kind: 'treasure' as const, id: `treasure:g${grade}-0${i + 1}` } }))),
  { appId: 'kanji', modeId: 'reading-difference', stageId: 'kanji:reading-difference-01', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:reading-difference-01' } },
  ...(['addition', 'subtraction', 'multiplication'] as const).flatMap((operation) => ([10, 25, 100] as const).map((size) => ({ appId: 'calculation' as const, modeId: operation, stageId: `calculation:${operation}-${size}`, questionCount: size, calculation: { operation, size } }))),
]

export function findCatalogEntry(record: Pick<CompletionRecord, 'appId' | 'modeId' | 'stageId'>) {
  return CATALOG.find((entry) => entry.appId === record.appId && entry.modeId === record.modeId && entry.stageId === record.stageId)
}

export function validateCompletionRecord(value: unknown): value is CompletionRecord {
  if (!value || typeof value !== 'object') return false
  const r = value as Partial<CompletionRecord>
  if (typeof r.sessionId !== 'string' || !r.sessionId.trim() || typeof r.appId !== 'string' || typeof r.modeId !== 'string' || typeof r.stageId !== 'string') return false
  if (!Number.isSafeInteger(r.questionCount) || !Number.isSafeInteger(r.firstCorrectCount) || (r.firstCorrectCount as number) < 0 || (r.firstCorrectCount as number) > (r.questionCount as number)) return false
  if (typeof r.completedAt !== 'string' || !Number.isFinite(Date.parse(r.completedAt))) return false
  const entry = findCatalogEntry(r as CompletionRecord)
  if (!entry || r.questionCount !== entry.questionCount) return false
  if (entry.calculation) {
    if (r.size !== entry.calculation.size || r.modeId !== entry.calculation.operation) return false
    if (r.timed !== undefined && typeof r.timed !== 'boolean') return false
    if (r.elapsedMs !== undefined && (!Number.isSafeInteger(r.elapsedMs) || r.elapsedMs < 0)) return false
    if (r.timed === true && r.elapsedMs === undefined) return false
    if (r.timed !== true && r.elapsedMs !== undefined) return false
  } else if (r.size !== undefined || r.timed !== undefined || r.elapsedMs !== undefined) return false
  return true
}

export function getReward(record: CompletionRecord) {
  if (!validateCompletionRecord(record)) return undefined
  return findCatalogEntry(record)?.reward
}
