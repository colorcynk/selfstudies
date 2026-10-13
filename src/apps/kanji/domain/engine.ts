import { NORMAL_QUESTIONS, NORMAL_STAGES, type NormalQuestion } from '../data/normal'
import { READING_DIFFERENCE_SENTENCES, type ReadingDifferenceSentence } from '../data/readingDifference'

export type AnswerMap = Readonly<Record<string, string>>
export interface DifferenceGrade {
  correctness: Readonly<Record<string, boolean>>
  lockedTargetIds: readonly string[]
  firstAttemptCorrect: boolean
  complete: boolean
}

export function getNormalStage(stageId: string) {
  return NORMAL_STAGES.find((stage) => stage.id === stageId)
}

export function getReadingDifferenceStage(): readonly ReadingDifferenceSentence[] {
  return READING_DIFFERENCE_SENTENCES
}

/** Grades only the supplied question; callers retain first-attempt scores separately from retries. */
export function gradeNormalQuestion(question: NormalQuestion, answer: string): boolean {
  return question.choices.includes(answer) && answer === question.answer
}

/** A target already locked as correct cannot be changed or made incorrect by a later submission. */
export function gradeReadingDifferenceSentence(
  sentence: ReadingDifferenceSentence,
  answers: AnswerMap,
  previouslyLockedTargetIds: readonly string[] = [],
  isFirstAttempt = true,
): DifferenceGrade {
  const locked = new Set(previouslyLockedTargetIds)
  const correctness: Record<string, boolean> = {}
  for (const target of sentence.targets) {
    correctness[target.id] = locked.has(target.id) || (target.choices.includes(answers[target.id] ?? '') && answers[target.id] === target.answer)
  }
  const allCorrect = sentence.targets.every((target) => correctness[target.id])
  return {
    correctness,
    lockedTargetIds: sentence.targets.filter((target) => correctness[target.id]).map((target) => target.id),
    firstAttemptCorrect: isFirstAttempt && previouslyLockedTargetIds.length === 0 && allCorrect,
    complete: allCorrect,
  }
}

export function isUsageAnswerLeaked(question: NormalQuestion): boolean {
  return question.skill === 'usage' && question.prompt.includes(question.answer)
}

export function isNormalContentValid(): boolean {
  const ids = new Set<string>()
  for (const question of NORMAL_QUESTIONS) {
    if (ids.has(question.id) || question.choices.length !== 4 || new Set(question.choices).size !== 4) return false
    ids.add(question.id)
    if (!question.choices.includes(question.answer) || !question.prompt || !question.hint) return false
    if (isUsageAnswerLeaked(question)) return false
  }
  return NORMAL_STAGES.length === 8 && NORMAL_STAGES.every((stage) => {
    const counts = stage.questions.reduce((acc, question) => acc + (question.skill === 'reading' ? 1 : 0), 0)
    return stage.questions.length === 5 && counts > 0 && counts < 5 && new Set(stage.questions.map((question) => question.id)).size === 5
  })
}

export function isReadingDifferenceContentValid(): boolean {
  const ids = new Set<string>()
  for (const sentence of READING_DIFFERENCE_SENTENCES) {
    if (ids.has(sentence.id)) return false
    ids.add(sentence.id)
    const [first, second] = sentence.targets
    if (first.kanji !== second.kanji || first.answer === second.answer) return false
    for (const target of sentence.targets) {
      if (target.choices.length !== 4 || new Set(target.choices).size !== 4 || !target.choices.includes(target.answer) || !target.hint) return false
      if (sentence.segments.filter((segment) => segment.targetId === target.id).length !== 1) return false
    }
    if (sentence.segments.filter((segment) => segment.text === first.kanji).length !== 2) return false
  }
  return READING_DIFFERENCE_SENTENCES.length === 5
}
