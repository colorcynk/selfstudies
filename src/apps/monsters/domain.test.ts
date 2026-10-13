import { describe, expect, it } from 'vitest'
import { getFirstTryScoreAfterAnswer, createStageQuestions, getStagePracticeHistory, MONSTERS } from './domain'

describe('multiplication stages', () => {
  it('contains each multiplier once in shuffled order and correct answers', () => {
    const stage = createStageQuestions(7, () => 0.4)
    expect(stage).toHaveLength(9)
    expect(stage.map(q => q.multiplier).sort()).toEqual([1,2,3,4,5,6,7,8,9])
    expect(stage.every(q => q.answer === 7 * q.multiplier)).toBe(true)
    expect(stage.map(q => q.multiplier)).not.toEqual([1,2,3,4,5,6,7,8,9])
  })

  it('rejects tables outside the nine catalog stages', () => {
    expect(() => createStageQuestions(0)).toThrow(RangeError)
    expect(() => createStageQuestions(10)).toThrow(RangeError)
  })

  it('provides nine distinct named collectible designs', () => {
    expect(MONSTERS).toHaveLength(9)
    expect(new Set(MONSTERS.map(m => m.name)).size).toBe(9)
    expect(new Set(MONSTERS.map(m => m.ears)).size).toBe(9)
  })

  it('counts a retry as no additional first-try point and sorts practice newest first', () => {
    expect(getFirstTryScoreAfterAnswer(4, false)).toBe(5)
    expect(getFirstTryScoreAfterAnswer(4, true)).toBe(4)
    const history = [
      { stageId: 'monsters:dan-2', firstCorrectCount: 7, completedAt: '2026-10-02T00:00:00Z' },
      { stageId: 'monsters:dan-1', firstCorrectCount: 4, completedAt: '2026-10-01T00:00:00Z' },
      { stageId: 'monsters:dan-1', firstCorrectCount: 8, completedAt: '2026-10-03T00:00:00Z' },
    ]
    expect(getStagePracticeHistory(history, 1).map(result => result.firstCorrectCount)).toEqual([8, 4])
    expect(getStagePracticeHistory(history, 4)).toEqual([])
  })
})
