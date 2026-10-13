import { describe, expect, it } from 'vitest'
import { NORMAL_QUESTIONS, NORMAL_STAGES } from '../data/normal'
import { READING_DIFFERENCE_SENTENCES, READING_DIFFERENCE_STAGE_ID } from '../data/readingDifference'
import { gradeNormalQuestion, gradeReadingDifferenceSentence, isNormalContentValid, isReadingDifferenceContentValid, isUsageAnswerLeaked } from './engine'

describe('kanji content contracts', () => {
  it('has 40 normal items in eight unique five-question stages with both skills and four choices', () => {
    expect(NORMAL_QUESTIONS).toHaveLength(40)
    expect(NORMAL_STAGES).toHaveLength(8)
    expect(isNormalContentValid()).toBe(true)
    expect(new Set(NORMAL_QUESTIONS.map((question) => question.id)).size).toBe(40)
    for (const stage of NORMAL_STAGES) expect(stage.questions).toHaveLength(5)
  })

  it('keeps usage answers out of prompts and grades a normal question by its single contextual choice', () => {
    for (const question of NORMAL_QUESTIONS.filter((item) => item.skill === 'usage')) {
      expect(isUsageAnswerLeaked(question)).toBe(false)
    }
    const usageQuestion = NORMAL_QUESTIONS.find((item) => item.skill === 'usage')!
    const leakedQuestion = { ...usageQuestion, prompt: `答えの字は${usageQuestion.answer}です。` }
    expect(isUsageAnswerLeaked(leakedQuestion)).toBe(true)
    const question = NORMAL_QUESTIONS[0]
    expect(gradeNormalQuestion(question, question.answer)).toBe(true)
    expect(gradeNormalQuestion(question, question.choices.find((choice) => choice !== question.answer)!)).toBe(false)
    expect(gradeNormalQuestion(question, 'not-a-choice')).toBe(false)
  })

  it('has exactly five additional two-target sentences with unique readings and marked occurrences', () => {
    expect(READING_DIFFERENCE_SENTENCES).toHaveLength(5)
    expect(READING_DIFFERENCE_STAGE_ID).toBe('kanji:reading-difference-01')
    expect(isReadingDifferenceContentValid()).toBe(true)
  })

  it('counts first score by sentence: both correct, one wrong, both wrong', () => {
    const sentence = READING_DIFFERENCE_SENTENCES[0]
    const [a, b] = sentence.targets
    expect(gradeReadingDifferenceSentence(sentence, { [a.id]: a.answer, [b.id]: b.answer }).firstAttemptCorrect).toBe(true)
    const oneWrong = gradeReadingDifferenceSentence(sentence, { [a.id]: a.answer, [b.id]: b.choices.find((x) => x !== b.answer)! })
    expect(oneWrong.firstAttemptCorrect).toBe(false)
    expect(oneWrong.complete).toBe(false)
    expect(gradeReadingDifferenceSentence(sentence, { [a.id]: 'bad', [b.id]: 'bad' }).firstAttemptCorrect).toBe(false)
    expect(gradeReadingDifferenceSentence(sentence, { [a.id]: a.answer, [b.id]: b.answer }, [], false).firstAttemptCorrect).toBe(false)
  })

  it('locks the correct target during retry while the wrong target can be corrected', () => {
    const sentence = READING_DIFFERENCE_SENTENCES[1]
    const [a, b] = sentence.targets
    const first = gradeReadingDifferenceSentence(sentence, { [a.id]: a.answer, [b.id]: 'wrong' })
    expect(first.lockedTargetIds).toEqual([a.id])
    const retry = gradeReadingDifferenceSentence(sentence, { [a.id]: 'changed', [b.id]: b.answer }, first.lockedTargetIds)
    expect(retry.correctness[a.id]).toBe(true)
    expect(retry.complete).toBe(true)
    expect(retry.firstAttemptCorrect).toBe(false)
    expect(retry.lockedTargetIds).toEqual([a.id, b.id])
  })
})
