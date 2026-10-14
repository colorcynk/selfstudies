import { describe, expect, it } from 'vitest'
import { CATALOG, validateCompletionRecord } from './catalog'
import { addCompletion, emptyProgress } from './reducer'
import { clearProgress, loadProgress, saveProgress, type StorageLike } from './storage'
import type { CompletionRecord } from './types'

const record = (extra: Partial<CompletionRecord> = {}): CompletionRecord => ({ sessionId: 's1', appId: 'monsters', modeId: 'kuku', stageId: 'monsters:dan-1', questionCount: 9, firstCorrectCount: 7, completedAt: '2026-10-09T00:00:00.000Z', ...extra })
class MemoryStorage implements StorageLike {
  data = new Map<string, string>()
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, value) }
  removeItem(key: string) { this.data.delete(key) }
}

describe('progress catalog and reducer', () => {
  it('defines the approved catalog and rejects mismatched or out-of-range completions', () => {
    expect(CATALOG).toHaveLength(42)
    expect(validateCompletionRecord(record())).toBe(true)
    expect(validateCompletionRecord(record({ stageId: 'monsters:dan-10' }))).toBe(false)
    expect(validateCompletionRecord(record({ questionCount: 8 }))).toBe(false)
    expect(validateCompletionRecord(record({ firstCorrectCount: 10 }))).toBe(false)
  })
  it('awards only catalog rewards, keeps 50 records, and ignores duplicate session IDs', () => {
    let progress = emptyProgress()
    progress = addCompletion(progress, record())
    expect(progress.rewards.monster).toEqual(['monster:dan-1'])
    expect(addCompletion(progress, record())).toBe(progress)
    for (let n = 2; n <= 52; n++) progress = addCompletion(progress, record({ sessionId: `s${n}`, stageId: `monsters:dan-${(n % 9) + 1}` }))
    expect(progress.history).toHaveLength(50)
    expect(progress.rewards.monster).toHaveLength(9)
  })
  it('accepts only eligible timed full-score calculation bests', () => {
    const calc = record({ appId: 'calculation', modeId: 'addition', stageId: 'calculation:addition-10', questionCount: 10, firstCorrectCount: 10, size: 10, timed: true, elapsedMs: 4000 })
    let progress = addCompletion(emptyProgress(), calc)
    expect(progress.bestTimes['addition-10']?.elapsedMs).toBe(4000)
    progress = addCompletion(progress, { ...calc, sessionId: 's2', elapsedMs: 5000 })
    expect(progress.bestTimes['addition-10']?.elapsedMs).toBe(4000)
    expect(validateCompletionRecord({ ...calc, sessionId: 's3', size: 25 })).toBe(false)
    expect(addCompletion(emptyProgress(), { ...calc, firstCorrectCount: 9 }).bestTimes).toEqual({})
  })
})

describe('versioned storage', () => {
  it('round-trips one app key and leaves unrelated keys untouched on reset', () => {
    const storage = new MemoryStorage()
    storage.setItem('unrelated', 'keep')
    const progress = addCompletion(emptyProgress(), record())
    expect(saveProgress(progress, storage)).toBe(true)
    expect(loadProgress(storage)).toEqual({ progress, storageStatus: 'ready' })
    clearProgress(storage)
    expect(storage.getItem('unrelated')).toBe('keep')
  })
  it('handles corrupt, unknown-version, and blocked storage without throwing', () => {
    const storage = new MemoryStorage()
    storage.setItem('manabi-game-hiroba.progress', '{broken')
    expect(loadProgress(storage).storageStatus).toBe('corrupt')
    storage.setItem('manabi-game-hiroba.progress', JSON.stringify({ version: 99, progress: {} }))
    expect(loadProgress(storage).storageStatus).toBe('unknown-version')
    const blocked: StorageLike = { getItem() { throw Error() }, setItem() { throw Error() }, removeItem() { throw Error() } }
    expect(loadProgress(blocked).storageStatus).toBe('unavailable')
    expect(saveProgress(emptyProgress(), blocked)).toBe(false)
  })
  it('rejects otherwise valid progress with unknown reward keys', () => {
    const storage = new MemoryStorage()
    const progress = emptyProgress()
    for (const extra of [[], null]) {
      storage.setItem('manabi-game-hiroba.progress', JSON.stringify({
        version: 1,
        progress: { ...progress, rewards: { ...progress.rewards, extra } },
      }))
      expect(loadProgress(storage)).toEqual({ progress: emptyProgress(), storageStatus: 'corrupt' })
    }
  })

  it('keeps all original shopping stamps and accepts new two-digit quests after reload', () => {
    const storage = new MemoryStorage()
    let progress = emptyProgress()
    for (let number = 1; number <= 6; number++) {
      progress = addCompletion(progress, record({
        sessionId: `original-${number}`, appId: 'shopping',
        modeId: number === 5 ? 'multiplication-count' : number === 6 ? 'multiplication-money' : 'standard',
        stageId: `shopping:quest-0${number}`, questionCount: number >= 5 ? 3 : 2,
        firstCorrectCount: number >= 5 ? 3 : 2,
      }))
    }
    saveProgress(progress, storage)
    const loaded = loadProgress(storage)
    expect(loaded.storageStatus).toBe('ready')
    expect(loaded.progress).toEqual(progress)
    const newQuest = record({ sessionId: 'new-15', appId: 'shopping', modeId: 'multiplication-count', stageId: 'shopping:quest-15', questionCount: 3, firstCorrectCount: 3 })
    progress = addCompletion(loaded.progress, newQuest)
    expect(progress.rewards.stamp).toEqual([...loaded.progress.rewards.stamp, 'stamp:quest-15'])
    expect(addCompletion(progress, { ...newQuest, sessionId: 'replay-15' }).rewards.stamp).toHaveLength(7)
    expect(validateCompletionRecord({ ...newQuest, stageId: 'shopping:quest-16' })).toBe(false)
    saveProgress(progress, storage)
    expect(loadProgress(storage)).toEqual({ progress, storageStatus: 'ready' })
  })
})
