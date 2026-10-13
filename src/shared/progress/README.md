# Progress and interaction contracts

This document is the integration contract for game producers. User-facing text stays Japanese; this API documentation is for implementers.

## Stable catalog

Import `CATALOG`, `findCatalogEntry(record)`, `getReward(record)`, and `validateCompletionRecord(value)` from `src/shared/progress/catalog.ts`. Do not invent IDs or rewards in app code.

| appId | modeId | stageId | questionCount | reward |
| --- | --- | --- | ---: | --- |
| `monsters` | `kuku` | `monsters:dan-1` … `monsters:dan-9` | 9 | `monster:dan-N` |
| `shopping` | `standard` | `shopping:quest-01` … `shopping:quest-04` | 2 numeric answers | `stamp:quest-NN` |
| `shopping` | `multiplication-count` | `shopping:quest-05` | 3 numeric answers | `stamp:quest-05` |
| `shopping` | `multiplication-money` | `shopping:quest-06` | 3 numeric answers | `stamp:quest-06` |
| `kanji` | `standard` | `kanji:g2-01` … `g2-04`, `kanji:g3-01` … `g3-04` | 5 | `treasure:gN-NN` |
| `kanji` | `reading-difference` | `kanji:reading-difference-01` | 5 sentences | `treasure:reading-difference-01` |
| `calculation` | `addition`, `subtraction`, `multiplication` | `calculation:{operation}-{size}` | size | none |

Calculation size is `10 | 25 | 100`. `questionCount` means cells for calculation, and first-attempt correct cells. Other apps count questions; shopping excludes item-selection edits and counts numeric-answer questions. Reading-difference counts a sentence correct only when both blanks were correct on its first check.

## Completion record

`CompletionRecord` fields are `sessionId: string`, `appId: AppId`, `modeId: ModeId`, `stageId: string`, `questionCount: number`, `firstCorrectCount: number`, and ISO `completedAt: string`. Calculation records also require `size: 10 | 25 | 100`; they may set `timed: boolean` and `elapsedMs: number`. A best time is eligible only when `timed === true`, elapsed time is present, and every cell was correct on first attempt. The record's app/mode/stage and count must exactly match the catalog. Invalid records are rejected and award nothing.

Create a stable session ID once when a run begins and reuse it through completion. Call the provider only after all required answers are complete:

```tsx
const { completeSession } = useProgress()
completeSession({
  sessionId, appId: 'monsters', modeId: 'kuku', stageId: 'monsters:dan-1',
  questionCount: 9, firstCorrectCount, completedAt: new Date().toISOString(),
})
```

## Provider and persistence

`ProgressProvider` is mounted around the app in `src/main.tsx`. `useProgress()` returns:

- `progress: Progress` with `history: CompletionRecord[]` (last 50), `rewards: { monster: string[]; stamp: string[]; treasure: string[] }`, and `bestTimes: Record<string, { elapsedMs: number; completedAt: string }>` keyed by e.g. `addition-10`.
- `storageStatus: 'ready' | 'unavailable' | 'corrupt' | 'unknown-version'`.
- `completeSession(record: CompletionRecord): boolean`; returns false for invalid or already-recorded session IDs. Reward IDs and reward sets come only from the catalog, and replays never duplicate a reward.
- `resetProgress(): void`; clears in-memory progress and only `manabi-game-hiroba.progress` from localStorage.

Storage uses one key, `manabi-game-hiroba.progress`, envelope `{ "version": 1, "progress": ... }`. Save failures leave the current memory session usable. Corrupt data starts a playable empty session. Unknown versions are not written automatically; an explicit confirmed reset may clear this app's key. Other localStorage keys are never touched.

## Input and event guard

`parseIntegerInput(raw: string): number | null` from `src/shared/interaction/guard.ts` accepts only safe, non-negative base-10 integers; blank, `-1`, `1.5`, signs, and non-digits return `null` (so blank is not zero).

Create one `createSubmissionGuard()` per live game. Call `const token = guard.setQuestion(questionId)` when the active question changes, and capture that token in callbacks. `submit(questionId, token, action)` synchronously locks before invoking the action; duplicate submits, callbacks from another question, and callbacks from an earlier attempt all return false. On a wrong answer call `const retryToken = guard.rearm(questionId, token)` and capture the returned token for retry callbacks. The old token cannot submit or rearm again. Do not rearm after a correct answer. The first-attempt score belongs in app state and must only be set during the first submit, never in the rearmed retry callback.
