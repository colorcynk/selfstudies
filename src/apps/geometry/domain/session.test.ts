import { describe, expect, it } from 'vitest'
import { createSubmissionGuard, parseIntegerInput } from '../../../shared/interaction/guard'
import { GEOMETRY_STAGES, getGeometryStage } from '../data'
import { canRecordCompletion, initialSession, transitionSession } from './session'

const stage = GEOMETRY_STAGES[0]
const start = (id = 'run-1') => transitionSession(transitionSession(initialSession(), { type: 'select-stage', stage }), { type: 'begin', sessionId: id })

describe('geometry session transitions', () => {
  it('ignores unselected and invalid submissions', () => {
    const empty = initialSession()
    expect(transitionSession(empty, { type: 'begin', sessionId: 'x' })).toBe(empty)
    expect(transitionSession(empty, { type: 'select-stage', stage: undefined })).toBe(empty)
    expect(transitionSession(empty, { type: 'submit', sessionId: '', questionId: 'unknown', valid: true, correct: true })).toBe(empty)
    const active = start()
    expect(transitionSession(active, { type: 'submit', sessionId: active.sessionId!, questionId: active.questionIds[0], valid: false, correct: false })).toBe(active)
  })

  it('allows wrong then correct, but removes first-try eligibility', () => {
    const active = start()
    const wrong = transitionSession(active, { type: 'submit', sessionId: active.sessionId!, questionId: active.questionIds[0], valid: true, correct: false })
    expect(wrong.phase).toBe('answer')
    const correct = transitionSession(wrong, { type: 'submit', sessionId: wrong.sessionId!, questionId: wrong.questionIds[0], valid: true, correct: true })
    expect(correct.phase).toBe('explanation')
    expect(correct.firstCorrectCount).toBe(0)
  })

  it('records first-try correct answers only, with scores from zero through five', () => {
    for (let target = 0; target <= 5; target++) {
      let state = start()
      for (let question = 0; question < 5; question++) {
        if (question >= target) state = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: state.questionIds[question], valid: true, correct: false })
        state = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: state.questionIds[question], valid: true, correct: true })
        expect(state.phase).toBe('explanation')
        state = transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: state.questionIds[question] })
      }
      expect(state.firstCorrectCount).toBe(target)
      expect(canRecordCompletion(state)).toBe(true)
    }
  })

  it('does not permit completion before advancing past the final explanation', () => {
    let state = start()
    for (let question = 0; question < 5; question++) {
      state = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: state.questionIds[question], valid: true, correct: true })
      if (question < 4) state = transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: state.questionIds[question] })
    }
    expect(state.phase).toBe('explanation')
    expect(canRecordCompletion(state)).toBe(false)
    state = transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: state.questionIds[4] })
    expect(state.phase).toBe('result')
    expect(canRecordCompletion(state)).toBe(true)
  })

  it('ignores stale phase events and cannot complete twice from the result phase', () => {
    let state = start()
    const stale = state
    state = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: state.questionIds[0], valid: true, correct: true })
    expect(transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: state.questionIds[0], valid: true, correct: true })).toBe(state)
    for (let question = 0; question < 4; question++) {
      state = transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: state.questionIds[question] })
      state = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: state.questionIds[question + 1], valid: true, correct: true })
    }
    state = transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: state.questionIds[4] })
    expect(state.phase).toBe('result')
    expect(transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: state.questionIds[4] })).toBe(state)
    expect(transitionSession(stale, { type: 'advance', sessionId: stale.sessionId!, questionId: stale.questionIds[0] })).toBe(stale)
  })

  it('abandons an unfinished run without becoming completion eligible and rejects old-run events', () => {
    let oldRun = start()
    const oldSessionId = oldRun.sessionId!
    oldRun = transitionSession(oldRun, { type: 'abandon' })
    expect(oldRun.phase).toBe('select')
    expect(canRecordCompletion(oldRun)).toBe(false)
    const newRun = start('run-2')
    expect(newRun.sessionId).not.toBe(oldSessionId)
    expect(transitionSession(newRun, { type: 'submit', sessionId: oldSessionId, questionId: newRun.questionIds[0], valid: true, correct: true })).toBe(newRun)
  })

  it('rejects stale answer and retry tokens after moving to the next question', () => {
    let state = start()
    const oldId = state.questionIds[0]
    const oldGuard = createSubmissionGuard()
    const oldToken = oldGuard.setQuestion(oldId)
    oldGuard.submit(oldId, oldToken, () => { state = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: oldId, valid: true, correct: false }) })
    const retryToken = oldGuard.rearm(oldId, oldToken)!
    const originalSession = state.sessionId!
    state = transitionSession(state, { type: 'submit', sessionId: originalSession, questionId: oldId, valid: true, correct: true })
    state = transitionSession(state, { type: 'advance', sessionId: originalSession, questionId: oldId })
    const newId = state.questionIds[1]
    const staleCall = () => { state = transitionSession(state, { type: 'submit', sessionId: originalSession, questionId: oldId, valid: true, correct: true }) }
    expect(oldGuard.submit(oldId, retryToken, staleCall)).toBe(true)
    expect(state.phase).toBe('answer')
    expect(state.questionIndex).toBe(1)
    expect(oldGuard.rearm(oldId, oldToken)).toBeNull()
    expect(newId).not.toBe(oldId)
  })

  it('locks Enter and click duplicates and records final completion once', () => {
    let state = start()
    let records = 0
    for (let index = 0; index < 5; index++) {
      const id = state.questionIds[index]
        state = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: id, valid: true, correct: true })
      const guard = createSubmissionGuard()
      const guardId = `${id}:advance`
      const token = guard.setQuestion(guardId)
      const advance = () => {
        state = transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: id })
        if (canRecordCompletion(state)) records++
      }
      guard.submit(guardId, token, advance) // keyboard Enter
      guard.submit(guardId, token, advance) // native click
    }
    expect(state.phase).toBe('result')
    expect(records).toBe(1)
  })

  it('keeps blank, negative, fractional, and nonnumeric count entries from consuming an attempt', () => {
    const countStage = GEOMETRY_STAGES.find((item) => item.mode === 'count')!
    const active = transitionSession(transitionSession(initialSession(), { type: 'select-stage', stage: countStage }), { type: 'begin', sessionId: 'count-run' })
    for (const raw of ['', '-1', '1.5', 'abc']) {
      expect(parseIntegerInput(raw)).toBeNull()
      const invalid = transitionSession(active, { type: 'submit', sessionId: active.sessionId!, questionId: active.questionIds[0], valid: false, correct: false })
      expect(invalid).toBe(active)
      expect(invalid.firstCorrectCount).toBe(0)
    }
    expect(parseIntegerInput('0')).toBe(0)
    expect(parseIntegerInput('21')).toBe(21)
  })

  it('scores a valid wrong count once, permits correction, and requires final count explanation before completion', () => {
    const countStage = GEOMETRY_STAGES.find((item) => item.mode === 'count')!
    let state = transitionSession(transitionSession(initialSession(), { type: 'select-stage', stage: countStage }), { type: 'begin', sessionId: 'count-run' })
    const questions = getGeometryStage(countStage.id)!.questions
    const first = questions[0]
    if (first.mode !== 'count') throw new Error('Expected a count question')
    const wrong = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: first.id, valid: true, correct: false })
    expect(wrong.phase).toBe('answer')
    const corrected = transitionSession(wrong, { type: 'submit', sessionId: wrong.sessionId!, questionId: first.id, valid: true, correct: true })
    expect(corrected.phase).toBe('explanation')
    expect(corrected.firstCorrectCount).toBe(0)
    state = corrected
    for (let index = 0; index < 4; index++) {
      state = transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: state.questionIds[index] })
      state = transitionSession(state, { type: 'submit', sessionId: state.sessionId!, questionId: state.questionIds[index + 1], valid: true, correct: true })
    }
    expect(state.phase).toBe('explanation')
    expect(canRecordCompletion(state)).toBe(false)
    state = transitionSession(state, { type: 'advance', sessionId: state.sessionId!, questionId: state.questionIds[4] })
    expect(state.phase).toBe('result')
    expect(canRecordCompletion(state)).toBe(true)
  })
})
