import type { GeometryStage } from '../data'

export type GeometryPhase = 'select' | 'instructions' | 'answer' | 'explanation' | 'result' | 'book'
export interface GeometrySession {
  phase: GeometryPhase
  stageId?: string
  questionIds: readonly string[]
  questionIndex: number
  firstCorrectCount: number
  /** IDs answered incorrectly at least once; retries never add first-try points. */
  lostFirstTry: readonly string[]
  sessionId?: string
  completionEligible: boolean
}
export type SessionEvent =
  | { type: 'select-stage'; stage?: GeometryStage }
  | { type: 'begin'; sessionId: string }
  | { type: 'submit'; sessionId: string; questionId: string; valid: boolean; correct: boolean }
  | { type: 'advance'; sessionId: string; questionId: string }
  | { type: 'open-book' }
  | { type: 'close-book' }
  | { type: 'choose-stage' }
  | { type: 'retry' }
  | { type: 'abandon' }

export const initialSession = (): GeometrySession => ({ phase: 'select', questionIds: [], questionIndex: 0, firstCorrectCount: 0, lostFirstTry: [], completionEligible: false })

/** Pure owner of stage progression, answer eligibility, scoring, and completion eligibility. */
export function transitionSession(state: GeometrySession, event: SessionEvent): GeometrySession {
  switch (event.type) {
    case 'select-stage':
      return state.phase === 'select' && event.stage
        ? { ...initialSession(), phase: 'instructions', stageId: event.stage.id, questionIds: event.stage.questions.map((question) => question.id) }
        : state
    case 'begin':
      return state.phase === 'instructions' && state.stageId
        ? { ...state, phase: 'answer', sessionId: event.sessionId }
        : state
    case 'submit': {
      if (state.phase !== 'answer' || !state.stageId || event.sessionId !== state.sessionId || event.questionId !== state.questionIds[state.questionIndex] || !event.valid) return state
      const id = `${state.stageId}:${state.questionIndex}`
      if (event.correct) return {
        ...state,
        phase: 'explanation',
        firstCorrectCount: state.firstCorrectCount + (state.lostFirstTry.includes(id) ? 0 : 1),
      }
      return state.lostFirstTry.includes(id) ? state : { ...state, lostFirstTry: [...state.lostFirstTry, id] }
    }
    case 'advance':
      if (state.phase !== 'explanation' || !state.stageId || event.sessionId !== state.sessionId || event.questionId !== state.questionIds[state.questionIndex]) return state
      if (state.questionIndex === 4) return { ...state, phase: 'result', completionEligible: true }
      return { ...state, phase: 'answer', questionIndex: state.questionIndex + 1 }
    case 'open-book':
      return state.phase === 'select' || state.phase === 'result' ? { ...state, phase: 'book' } : state
    case 'close-book':
      return state.phase === 'book' ? { ...initialSession(), phase: 'select' } : state
    case 'choose-stage':
      return state.phase === 'result' || state.phase === 'instructions' ? initialSession() : state
    case 'retry':
      return state.phase === 'result' && state.stageId ? { ...initialSession(), phase: 'instructions', stageId: state.stageId, questionIds: state.questionIds } : state
    case 'abandon':
      return state.phase === 'instructions' || state.phase === 'answer' || state.phase === 'explanation' ? initialSession() : state
  }
}

export function canRecordCompletion(state: GeometrySession): boolean {
  return state.phase === 'result' && state.completionEligible && Boolean(state.stageId && state.sessionId)
}
