export type Question = { multiplier: number; answer: number }
export type PracticeRecord = { stageId: string; firstCorrectCount: number; completedAt: string }

export function getStagePracticeHistory(records: readonly PracticeRecord[], table: number): PracticeRecord[] {
  const stageId = `monsters:dan-${table}`
  return records.filter(record => record.stageId === stageId)
    .slice()
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
}

export function getFirstTryScoreAfterAnswer(currentScore: number, wasAlreadyWrong: boolean): number {
  return currentScore + (wasAlreadyWrong ? 0 : 1)
}

/** Makes a shuffled, complete multiplication table for one stage. */
export function createStageQuestions(table: number, random: () => number = Math.random): Question[] {
  if (!Number.isInteger(table) || table < 1 || table > 9) throw new RangeError('table must be from 1 to 9')
  const questions = Array.from({ length: 9 }, (_, i) => ({ multiplier: i + 1, answer: table * (i + 1) }))
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[questions[i], questions[j]] = [questions[j], questions[i]]
  }
  return questions
}

export const MONSTERS = [
  { name: 'ほのおのポン', color: '#f4775e', accent: '#ffd77c', ears: 'round' },
  { name: 'みずたまリュウ', color: '#55a8d7', accent: '#d5f4ff', ears: 'horn' },
  { name: 'はっぱのモコ', color: '#72b878', accent: '#dbf3a0', ears: 'leaf' },
  { name: 'きら星ミミ', color: '#a080d0', accent: '#ffe482', ears: 'star' },
  { name: 'すなねこコロン', color: '#e7aa61', accent: '#fff0c1', ears: 'cat' },
  { name: 'こおりペンギン', color: '#648dcc', accent: '#e5f6ff', ears: 'wing' },
  { name: 'にじいろピヨ', color: '#e777a5', accent: '#fff0a7', ears: 'feather' },
  { name: 'くものぷかり', color: '#8b9bb1', accent: '#fff', ears: 'cloud' },
  { name: 'たいようガオ', color: '#ed9e38', accent: '#ffe18a', ears: 'sun' },
] as const

export type Monster = (typeof MONSTERS)[number]
