# Kanji content and grading integration contract

This folder is the T6 boundary for the kanji UI. User-facing content and labels are Japanese; this integration note is for implementers.

## Normal adventure

Import `NORMAL_QUESTIONS`, `NORMAL_STAGES`, `getNormalStage`, and `gradeNormalQuestion` from `domain/engine.ts` and `data/normal.ts`. Each stage has a stable catalog ID (`kanji:g2-01` through `kanji:g2-04`, then grade 3 equivalents), exactly five non-repeating questions, and a `grade`. A `NormalQuestion` has a stable `id`, `skill: 'reading' | 'usage'`, `targetKanji`, `prompt`, four `choices`, the matching `answer`, and a contextual `hint`. Usage prompts use a blank; reading prompts ask for a contextual reading. Submit the selected choice to `gradeNormalQuestion(question, answer)`.

## Reading-difference adventure

Import `getReadingDifferenceStage()` or `READING_DIFFERENCE_SENTENCES`. `READING_DIFFERENCE_STAGE_ID` is `kanji:reading-difference-01`; the function returns all five sentences for that stage; keep all five in the run, in any order, without duplicates. Render `segments` in order. A segment with `targetId` marks one occurrence and must be associated with the corresponding entry in `targets`; do not infer targets by searching sentence text. Each sentence has exactly two target records for the same `kanji`, each with a distinct hiragana `answer`, four `choices`, and a contextual `hint`. The provided strings around targets include no answer ruby.

Collect a selected answer by target ID, then call `gradeReadingDifferenceSentence(sentence, answers, previouslyLockedTargetIds, isFirstAttempt)`. Pass `false` for `isFirstAttempt` on every retry, including a retry after both targets were wrong. The result supplies per-target correctness, target IDs that must remain locked on retries, whether both targets are complete, and `firstAttemptCorrect`. Count the sentence in the first-attempt score only on its initial check when `firstAttemptCorrect` is true; never add score on retries. Keep the wrong target editable and the correct target locked. Complete all five sentences before creating a completion record with mode `reading-difference`, stage `kanji:reading-difference-01`, `questionCount: 5`, and the sentence-based first score. This mode uses its separate catalog treasure.

`isUsageAnswerLeaked(question)` rejects usage prompts that display the answer character. `isNormalContentValid()` and `isReadingDifferenceContentValid()` are invariant checks used by the focused domain tests. Provenance and per-target grade evidence are recorded in `docs/reviews/learning-content.md`.
