/** Parse a non-negative base-10 integer. Empty input and all signs/fractions are invalid. */
export function parseIntegerInput(raw: string): number | null {
  if (raw === '' || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

export interface SubmissionGuard {
  /** Returns the active attempt token. Capture it in callbacks for this attempt. */
  setQuestion(questionId: string): number
  submit(questionId: string, attemptToken: number, action: () => void): boolean
  /** Call only after a wrong answer when the same question may be retried. */
  /** Returns a new token; callbacks captured before rearm are now stale. */
  rearm(questionId: string, attemptToken: number): number | null
}

/** Synchronous lock prevents rapid events; question IDs reject callbacks from stale screens. */
export function createSubmissionGuard(): SubmissionGuard {
  let currentQuestion: string | undefined
  let submitted = false
  let generation = 0
  return {
    setQuestion(questionId) {
      if (currentQuestion !== questionId) { currentQuestion = questionId; submitted = false; generation++ }
      return generation
    },
    submit(questionId, attemptToken, action) {
      if (questionId !== currentQuestion || attemptToken !== generation || submitted) return false
      submitted = true // lock before invoking app code, including synchronous transitions
      action()
      return true
    },
    rearm(questionId, attemptToken) {
      if (questionId !== currentQuestion || attemptToken !== generation || !submitted) return null
      submitted = false
      generation++
      return generation
    },
  }
}
