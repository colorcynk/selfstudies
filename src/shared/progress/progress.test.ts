import { describe, expect, it } from 'vitest'
import { CATALOG, validateCompletionRecord } from './catalog'
import { GEOMETRY_CATALOG } from './geometryCatalog'
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
  it('keeps every pre-geometry catalog ID and attribute fixed in place', () => {
    const monsters = ['monsters:dan-1', 'monsters:dan-2', 'monsters:dan-3', 'monsters:dan-4', 'monsters:dan-5', 'monsters:dan-6', 'monsters:dan-7', 'monsters:dan-8', 'monsters:dan-9'].map((stageId, i) => ({ appId: 'monsters', modeId: 'kuku', stageId, questionCount: 9, reward: { kind: 'monster', id: `monster:dan-${i + 1}` } }))
    const shopping = ([
      ['shopping:quest-01', 'standard', 2], ['shopping:quest-02', 'standard', 2], ['shopping:quest-03', 'standard', 2], ['shopping:quest-04', 'standard', 2],
      ['shopping:quest-05', 'multiplication-count', 3], ['shopping:quest-06', 'multiplication-money', 3], ['shopping:quest-07', 'standard', 2], ['shopping:quest-08', 'standard', 2],
      ['shopping:quest-09', 'multiplication-count', 3], ['shopping:quest-10', 'multiplication-money', 3], ['shopping:quest-11', 'standard', 2], ['shopping:quest-12', 'multiplication-count', 3],
      ['shopping:quest-13', 'multiplication-money', 3], ['shopping:quest-14', 'multiplication-money', 3], ['shopping:quest-15', 'multiplication-count', 3],
    ] as const).map(([stageId, modeId, questionCount]) => ({ appId: 'shopping', modeId, stageId, questionCount, reward: { kind: 'stamp', id: stageId.replace('shopping:', 'stamp:') } }))
    const kanji = [
      ...['kanji:g2-01', 'kanji:g2-02', 'kanji:g2-03', 'kanji:g2-04', 'kanji:g3-01', 'kanji:g3-02', 'kanji:g3-03', 'kanji:g3-04'].map((stageId) => ({ appId: 'kanji', modeId: 'standard', stageId, questionCount: 5, reward: { kind: 'treasure', id: stageId.replace('kanji:', 'treasure:') } })),
      { appId: 'kanji', modeId: 'reading-difference', stageId: 'kanji:reading-difference-01', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:reading-difference-01' } },
    ]
    const calculation = ['addition', 'subtraction', 'multiplication'].flatMap((operation) => [10, 25, 100].map((size) => ({ appId: 'calculation', modeId: operation, stageId: `calculation:${operation}-${size}`, questionCount: size, calculation: { operation, size } })))
    expect(CATALOG.slice(0, 42)).toEqual([...monsters, ...shopping, ...kanji, ...calculation])
  })

  it('defines the approved catalog and rejects mismatched or out-of-range completions', () => {
    expect(CATALOG).toHaveLength(51)
    expect(CATALOG.slice(42)).toEqual([
      { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-circle', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-circle' } },
      { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-square', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-square' } },
      { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-rectangle', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-rectangle' } },
      { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-equilateral', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-equilateral' } },
      { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-isosceles', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-isosceles' } },
      { appId: 'geometry', modeId: 'geometry-match', stageId: 'geometry:match-right-triangle', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-match-right-triangle' } },
      { appId: 'geometry', modeId: 'geometry-count', stageId: 'geometry:count-intro', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-count-intro' } },
      { appId: 'geometry', modeId: 'geometry-count', stageId: 'geometry:count-composite', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-count-composite' } },
      { appId: 'geometry', modeId: 'geometry-count', stageId: 'geometry:count-mixed', questionCount: 5, reward: { kind: 'treasure', id: 'treasure:shape-count-mixed' } },
    ])
    expect(GEOMETRY_CATALOG).toHaveLength(9)
    expect(validateCompletionRecord(record())).toBe(true)
    expect(validateCompletionRecord(record({ stageId: 'monsters:dan-10' }))).toBe(false)
    expect(validateCompletionRecord(record({ questionCount: 8 }))).toBe(false)
    expect(validateCompletionRecord(record({ firstCorrectCount: 10 }))).toBe(false)
  })
  it('accepts all nine geometry stages, awards each treasure once, and rejects bad modes or counts', () => {
    let progress = emptyProgress()
    for (const [index, stage] of GEOMETRY_CATALOG.entries()) {
      const completion = record({ sessionId: `geometry-${index}`, ...stage, firstCorrectCount: 4 })
      expect(validateCompletionRecord(completion)).toBe(true)
      progress = addCompletion(progress, completion)
      const beforeReplayRewards = progress.rewards.treasure
      const beforeReplayHistoryLength = progress.history.length
      progress = addCompletion(progress, { ...completion, sessionId: `geometry-replay-${index}` })
      expect(progress.rewards.treasure).toEqual(beforeReplayRewards)
      expect(progress.history).toHaveLength(beforeReplayHistoryLength + 1)
      expect(validateCompletionRecord({ ...completion, modeId: 'geometry-count' === stage.modeId ? 'geometry-match' : 'geometry-count' })).toBe(false)
      expect(validateCompletionRecord({ ...completion, questionCount: 4 })).toBe(false)
    }
    expect(progress.rewards.treasure).toEqual(GEOMETRY_CATALOG.map((stage) => stage.reward!.id))
    expect(progress.history).toHaveLength(18)
    expect(addCompletion(progress, record({ sessionId: 'geometry-0', ...GEOMETRY_CATALOG[0] }))).toBe(progress)
  })
  it('retains geometry rewards and only the newest 50 completions after reload', () => {
    const storage = new MemoryStorage()
    let progress = emptyProgress()
    for (let index = 0; index < 60; index++) {
      const stage = GEOMETRY_CATALOG[index % GEOMETRY_CATALOG.length]
      progress = addCompletion(progress, record({ sessionId: `geometry-history-${index}`, ...stage, firstCorrectCount: 5 }))
    }
    expect(progress.history).toHaveLength(50)
    expect(progress.history[0].sessionId).toBe('geometry-history-10')
    expect(progress.rewards.treasure).toEqual(GEOMETRY_CATALOG.map((stage) => stage.reward!.id))
    expect(saveProgress(progress, storage)).toBe(true)
    expect(loadProgress(storage)).toEqual({ progress, storageStatus: 'ready' })
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
  it('loads a fixed version 1 snapshot with all four original apps, rewards, and calculation bests', () => {
    const storage = new MemoryStorage()
    const legacy = {
      history: [
        record({ sessionId: 'legacy-monster', appId: 'monsters', modeId: 'kuku', stageId: 'monsters:dan-1', questionCount: 9, firstCorrectCount: 9 }),
        record({ sessionId: 'legacy-shopping', appId: 'shopping', modeId: 'standard', stageId: 'shopping:quest-01', questionCount: 2, firstCorrectCount: 2 }),
        record({ sessionId: 'legacy-kanji', appId: 'kanji', modeId: 'standard', stageId: 'kanji:g2-01', questionCount: 5, firstCorrectCount: 5 }),
        record({ sessionId: 'legacy-calculation', appId: 'calculation', modeId: 'addition', stageId: 'calculation:addition-10', questionCount: 10, firstCorrectCount: 10, size: 10, timed: true, elapsedMs: 3000 }),
      ],
      rewards: { monster: ['monster:dan-1'], stamp: ['stamp:quest-01'], treasure: ['treasure:g2-01'] },
      bestTimes: { 'addition-10': { elapsedMs: 3000, completedAt: '2026-10-09T00:00:00.000Z' } },
    }
    storage.setItem('manabi-game-hiroba.progress', JSON.stringify({ version: 1, progress: legacy }))
    expect(loadProgress(storage)).toEqual({ progress: legacy, storageStatus: 'ready' })
  })

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
