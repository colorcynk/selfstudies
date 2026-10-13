import { asBestTime, emptyProgress } from './reducer'
import { STORAGE_KEY, STORAGE_VERSION } from './types'
import type { CompletionRecord, LoadedProgress, Progress, RewardKind } from './types'
import { CATALOG, validateCompletionRecord } from './catalog'

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
const rewardKinds: RewardKind[] = ['monster', 'stamp', 'treasure']

function validProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<Progress>
  if (!Array.isArray(v.history) || v.history.length > 50 || !v.history.every(validateCompletionRecord)) return false
  if (new Set(v.history.map((r) => r.sessionId)).size !== v.history.length) return false
  if (!v.rewards || typeof v.rewards !== 'object' || Array.isArray(v.rewards)) return false
  const rewardKeys = Object.keys(v.rewards)
  if (rewardKeys.length !== rewardKinds.length || !rewardKinds.every((kind) => rewardKeys.includes(kind))) return false
  if (!rewardKinds.every((kind) => Array.isArray(v.rewards?.[kind]) && new Set(v.rewards[kind]).size === v.rewards[kind].length && v.rewards[kind].every((id) => CATALOG.some((entry) => entry.reward?.kind === kind && entry.reward.id === id)))) return false
  if (!v.bestTimes || typeof v.bestTimes !== 'object' || !Object.entries(v.bestTimes).every(([key, time]) => /^(addition|subtraction|multiplication)-(10|25|100)$/.test(key) && asBestTime(time))) return false
  return true
}

function getStorage(): StorageLike | undefined {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage } catch { return undefined }
}

export function loadProgress(storage: StorageLike | undefined = getStorage()): LoadedProgress {
  if (!storage) return { progress: emptyProgress(), storageStatus: 'unavailable' }
  let raw: string | null
  try { raw = storage.getItem(STORAGE_KEY) } catch { return { progress: emptyProgress(), storageStatus: 'unavailable' } }
  if (raw === null) return { progress: emptyProgress(), storageStatus: 'ready' }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return { progress: emptyProgress(), storageStatus: 'corrupt' } }
  try {
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed)) return { progress: emptyProgress(), storageStatus: 'corrupt' }
    const envelope = parsed as { version: unknown; progress?: unknown }
    if (envelope.version !== STORAGE_VERSION) return { progress: emptyProgress(), storageStatus: 'unknown-version' }
    if (!validProgress(envelope.progress)) return { progress: emptyProgress(), storageStatus: 'corrupt' }
    return { progress: envelope.progress, storageStatus: 'ready' }
  } catch { return { progress: emptyProgress(), storageStatus: 'corrupt' } }
}

export function saveProgress(progress: Progress, storage: StorageLike | undefined = getStorage()): boolean {
  if (!storage) return false
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, progress })); return true } catch { return false }
}

export function clearProgress(storage: StorageLike | undefined = getStorage()): boolean {
  if (!storage) return false
  try { storage.removeItem(STORAGE_KEY); return true } catch { return false }
}

export function isCompletionRecord(value: unknown): value is CompletionRecord { return validateCompletionRecord(value) }
