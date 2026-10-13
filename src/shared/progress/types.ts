export type AppId = 'monsters' | 'shopping' | 'kanji' | 'calculation'
export type ModeId = 'kuku' | 'standard' | 'multiplication-count' | 'multiplication-money' | 'reading-difference' | 'addition' | 'subtraction' | 'multiplication'
export type RewardKind = 'monster' | 'stamp' | 'treasure'

export interface CompletionRecord {
  sessionId: string
  appId: AppId
  modeId: ModeId
  stageId: string
  questionCount: number
  firstCorrectCount: number
  completedAt: string
  elapsedMs?: number
  timed?: boolean
  /** Required for calculation records; describes the generated table size. */
  size?: 10 | 25 | 100
}

export interface BestTime { elapsedMs: number; completedAt: string }
export interface Progress {
  history: CompletionRecord[]
  rewards: Record<RewardKind, string[]>
  bestTimes: Record<string, BestTime>
}

export type StorageStatus = 'ready' | 'unavailable' | 'corrupt' | 'unknown-version'
export interface LoadedProgress { progress: Progress; storageStatus: StorageStatus }

export const STORAGE_KEY = 'manabi-game-hiroba.progress'
export const STORAGE_VERSION = 1 as const
