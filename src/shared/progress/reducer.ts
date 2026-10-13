import { findCatalogEntry, getReward, validateCompletionRecord } from './catalog'
import type { BestTime, CompletionRecord, Progress } from './types'

export const emptyProgress = (): Progress => ({ history: [], rewards: { monster: [], stamp: [], treasure: [] }, bestTimes: {} })

export function addCompletion(progress: Progress, record: CompletionRecord): Progress {
  if (!validateCompletionRecord(record) || progress.history.some((item) => item.sessionId === record.sessionId)) return progress
  const entry = findCatalogEntry(record)!
  const reward = getReward(record)
  const rewards = { ...progress.rewards }
  if (reward && !rewards[reward.kind].includes(reward.id)) rewards[reward.kind] = [...rewards[reward.kind], reward.id]
  const history = [...progress.history, record].slice(-50)
  const bestTimes = { ...progress.bestTimes }
  if (entry.calculation && record.timed === true && record.elapsedMs !== undefined && record.firstCorrectCount === record.questionCount) {
    const key = `${entry.calculation.operation}-${entry.calculation.size}`
    const current = bestTimes[key]
    if (!current || record.elapsedMs < current.elapsedMs) bestTimes[key] = { elapsedMs: record.elapsedMs, completedAt: record.completedAt }
  }
  return { history, rewards, bestTimes }
}

export function getBestTimeKey(operation: 'addition' | 'subtraction' | 'multiplication', size: 10 | 25 | 100) { return `${operation}-${size}` }
export function asBestTime(value: unknown): value is BestTime {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<BestTime>
  return Number.isSafeInteger(v.elapsedMs) && (v.elapsedMs as number) >= 0 && typeof v.completedAt === 'string' && Number.isFinite(Date.parse(v.completedAt))
}
