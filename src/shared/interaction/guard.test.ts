import { describe, expect, it } from 'vitest'
import { createSubmissionGuard, parseIntegerInput } from './guard'

describe('integer input parser', () => {
  it('distinguishes blank from zero and rejects negative, decimal, and unsafe input', () => {
    expect(parseIntegerInput('')).toBeNull()
    expect(parseIntegerInput('0')).toBe(0)
    expect(parseIntegerInput(' 0')).toBeNull()
    expect(parseIntegerInput('-2')).toBeNull()
    expect(parseIntegerInput('2.5')).toBeNull()
    expect(parseIntegerInput('9007199254740992')).toBeNull()
  })
})

describe('submission guard', () => {
  it('locks synchronously, rejects stale question events, and explicitly rearms retries', () => {
    const guard = createSubmissionGuard()
    const calls: string[] = []
    const firstAttempt = guard.setQuestion('q1')
    expect(guard.submit('q1', firstAttempt, () => calls.push('first wrong'))).toBe(true)
    expect(guard.submit('q1', firstAttempt, () => calls.push('duplicate'))).toBe(false)
    const retryAttempt = guard.rearm('q1', firstAttempt)
    expect(retryAttempt).not.toBeNull()
    expect(guard.rearm('q1', firstAttempt)).toBeNull()
    expect(guard.submit('q1', firstAttempt, () => calls.push('stale pre-retry'))).toBe(false)
    expect(guard.submit('q1', retryAttempt!, () => calls.push('retry'))).toBe(true)
    const nextAttempt = guard.setQuestion('q2')
    expect(guard.submit('q1', retryAttempt!, () => calls.push('stale old question'))).toBe(false)
    expect(guard.submit('q2', nextAttempt, () => calls.push('q2'))).toBe(true)
    expect(calls).toEqual(['first wrong', 'retry', 'q2'])
  })
})
