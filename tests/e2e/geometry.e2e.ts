import { expect, test } from '@playwright/test'
import { CATALOG } from '../../src/shared/progress/catalog'
import { GEOMETRY_STAGES } from '../../src/apps/geometry/data'
import { STORAGE_KEY } from '../../src/shared/progress/types'
import { go } from './helpers'
import { finishGeometry } from './geometry-helpers'

test('Geometry is reachable from home and direct hash links support browser history', async ({ page }) => {
  await go(page)
  await expect(page.getByRole('button', { name: /ずけいたんけん/ })).toBeVisible()
  await page.getByRole('button', { name: /ずけいたんけん/ }).click()
  await expect(page).toHaveURL(/#\/geometry$/)
  await expect(page.getByRole('heading', { name: 'ずけいたんけん', level: 2 })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: /なにしてあそぶ/ })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'ずけいたんけん', level: 2 })).toBeVisible()
  await go(page, '/geometry')
  await expect(page.getByRole('heading', { name: 'ずけいたんけん', level: 2 })).toBeVisible()
})

test('catalog retains all 42 existing stages and adds nine Geometry stages', () => {
  const existing = CATALOG.filter(entry => entry.appId !== 'geometry')
  const geometry = CATALOG.filter(entry => entry.appId === 'geometry')
  expect(existing).toHaveLength(42)
  expect(geometry).toHaveLength(9)
  expect(geometry.map(entry => [entry.stageId, entry.questionCount])).toEqual(
    GEOMETRY_STAGES.map(stage => [stage.id, 5]),
  )
  expect(CATALOG).toHaveLength(51)
})

test('legacy version 1 records, rewards and best times survive Geometry completion and reload', async ({ page }) => {
  const oldRecords = [
    { sessionId: 'old-monsters', appId: 'monsters', modeId: 'kuku', stageId: 'monsters:dan-1', questionCount: 9, firstCorrectCount: 8 },
    { sessionId: 'old-shopping', appId: 'shopping', modeId: 'standard', stageId: 'shopping:quest-01', questionCount: 2, firstCorrectCount: 2 },
    { sessionId: 'old-kanji', appId: 'kanji', modeId: 'standard', stageId: 'kanji:g2-01', questionCount: 5, firstCorrectCount: 4 },
    { sessionId: 'old-calculation', appId: 'calculation', modeId: 'addition', stageId: 'calculation:addition-10', questionCount: 10, firstCorrectCount: 10, size: 10, timed: true, elapsedMs: 12000 },
  ].map(record => ({ ...record, completedAt: '2026-01-01T00:00:00.000Z' }))
  const seed = JSON.stringify({ version: 1, progress: {
    history: oldRecords,
    rewards: { monster: ['monster:dan-1'], stamp: ['stamp:quest-01'], treasure: ['treasure:g2-01'] },
    bestTimes: { 'addition-10': { elapsedMs: 12000, completedAt: '2026-01-01T00:00:00.000Z' } },
  } })
  await go(page, '/settings')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, seed])
  await page.reload()
  await finishGeometry(page, 0)
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))!)
  expect(saved.version).toBe(1)
  expect(saved.progress.history).toHaveLength(5)
  expect(saved.progress.history.filter((record: { appId: string }) => record.appId !== 'geometry')).toEqual(oldRecords)
  expect(saved.progress.history.filter((record: { appId: string }) => record.appId === 'geometry')).toHaveLength(1)
  expect(saved.progress.rewards).toEqual({
    monster: ['monster:dan-1'], stamp: ['stamp:quest-01'],
    treasure: ['treasure:g2-01', 'treasure:shape-match-circle'],
  })
  expect(saved.progress.bestTimes).toEqual({ 'addition-10': { elapsedMs: 12000, completedAt: '2026-01-01T00:00:00.000Z' } })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'ずけいたんけん', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'ホームにもどる' }).click()
  await expect(page.getByRole('heading', { name: /なにしてあそぶ/ })).toBeVisible()
  await expect(page.getByText(/さいきんのきろく 5回 ・ 4こ あつめたよ/)).toBeVisible()
  await go(page, '/kanji')
  await expect(page.getByRole('button', { name: /宝もの図かん/ })).toBeVisible()
  await page.getByRole('button', { name: /宝もの図かん/ }).click()
  await expect(page.getByText(/1 \/ 9/)).toBeVisible()
})

test('unfinished Geometry reload returns to stage selection without adding reward', async ({ page }) => {
  await go(page, '/geometry')
  await page.getByRole('button', { name: /円を見つけよう/ }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  const q = GEOMETRY_STAGES[0]!.questions[0]!
  const answerIndex = q.mode === 'match' ? q.candidates.findIndex(candidate => candidate.id === q.answerId) : -1
  await page.getByRole('button', { name: `候補 ${answerIndex + 1}`, exact: false }).click()
  await page.getByRole('button', { name: 'こたえあわせ' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'ずけいたんけん', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'ずけいたんけん', level: 2 })).toHaveCount(1)
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull()
})

test('unknown version remains unchanged after Geometry completion', async ({ page }) => {
  const unknown = JSON.stringify({ version: 777, keep: 'same bytes' })
  await go(page, '/settings')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, unknown])
  await page.reload()
  await finishGeometry(page, 0)
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(unknown)
})

test('Geometry completes in memory when localStorage is unavailable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('blocked', 'SecurityError') },
  }))
  await go(page, '/geometry')
  await finishGeometry(page, 0)
  await expect(page.getByRole('status').filter({ hasText: '記録を保存できませんが、あそびは続けられます。' })).toBeVisible()
  await page.getByRole('button', { name: 'カードちょう' }).click()
  await expect(page.getByText(/見つけたカード：1 \/ 9まい/)).toBeVisible()
})

test('Geometry records 4/5 after retry, clears stale input, and held Enter cannot skip', async ({ page }) => {
  const stage = GEOMETRY_STAGES[6]!
  await go(page, '/geometry')
  await page.getByRole('button', { name: new RegExp(stage.title) }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  for (const [index, question] of stage.questions.entries()) {
    if (question.mode !== 'count') throw new Error('expected count question')
    const input = page.getByRole('textbox', { name: '見つけた数' })
    await expect(input).toHaveValue('')
    await input.fill(String(question.solutions.length + (index === 0 ? 1 : 0)))
    const submit = page.getByRole('button', { name: 'こたえあわせ' })
    if (index === 0) {
      await page.keyboard.down('Enter')
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', autoRepeat: true })
      await page.keyboard.up('Enter')
      await expect(page.getByRole('note').filter({ hasText: question.hint })).toBeVisible()
      await expect(page.locator('.geometry-play-head')).toContainText('1 / 5')
      await input.fill(String(question.solutions.length))
    }
    await submit.click()
    await expect(page.locator('.geometry-explanation')).toBeVisible()
    const next = page.getByRole('button', { name: index === 4 ? 'けっかをみる' : 'つぎへ' })
    if (index === 4) {
      await next.dblclick()
      await expect(page.getByRole('heading', { name: 'よくがんばったね！' })).toBeVisible()
      await expect(page.locator('.geometry-score')).toContainText('4 / 5')
      const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)) ?? 'null')
      expect(saved?.progress.history.filter((record: { stageId: string }) => record.stageId === stage.id)).toHaveLength(1)
      expect(saved?.progress.rewards.treasure.filter((reward: string) => reward === 'treasure:shape-count-intro')).toHaveLength(1)
    } else {
      await next.click()
      await expect(page.locator('.geometry-play-head')).toContainText(`${index + 2} / 5`)
    }
  }
})

test('reset clears Geometry progress and only the application storage key', async ({ page }) => {
  const otherKey = 'geometry-test.keep'
  await finishGeometry(page, 0)
  await page.evaluate(key => localStorage.setItem(key, 'keep'), otherKey)
  await go(page, '/settings')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: /記録をぜんぶ消す/ }).click()
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull()
  expect(await page.evaluate(key => localStorage.getItem(key), otherKey)).toBe('keep')
  await go(page, '/geometry')
  await page.getByRole('button', { name: 'はっけんカードちょう' }).click()
  await expect(page.getByText(/見つけたカード：0 \/ 9まい/)).toBeVisible()
})

test('Geometry retry counts only first-try answers and repeated submit/advance cannot skip', async ({ page }) => {
  const stage = GEOMETRY_STAGES[6]!
  const question = stage.questions[0]!
  if (question.mode !== 'count') throw new Error('expected count stage')
  await go(page, '/geometry')
  await page.getByRole('button', { name: new RegExp(stage.title) }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  const input = page.getByRole('textbox', { name: '見つけた数' })
  const submit = page.getByRole('button', { name: 'こたえあわせ' })
  await input.fill(String(question.solutions.length + 1))
  await submit.dblclick()
  await expect(page.getByRole('note').filter({ hasText: question.hint })).toBeVisible()
  await expect(page.locator('.geometry-play-head')).toContainText('1 / 5')
  await input.fill(String(question.solutions.length))
  await submit.dblclick()
  await expect(page.locator('.geometry-explanation')).toBeVisible()
  const advance = page.getByRole('button', { name: 'つぎへ' })
  await advance.dblclick()
  await expect(page.locator('.geometry-play-head')).toContainText('2 / 5')
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)) ?? 'null')
  expect(saved?.progress.history ?? []).toHaveLength(0)
})

test('Geometry completion registers one reward and one history row even after retrying the stage', async ({ page }) => {
  await finishGeometry(page, 0)
  const read = async () => JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))!)
  const completed = await read()
  expect(completed.progress.history.filter((record: { appId: string }) => record.appId === 'geometry')).toHaveLength(1)
  expect(completed.progress.rewards.treasure.filter((reward: string) => reward === 'treasure:shape-match-circle')).toHaveLength(1)
  await page.getByRole('button', { name: 'もう一度れんしゅう' }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  for (const [index, q] of GEOMETRY_STAGES[0]!.questions.entries()) {
    if (q.mode === 'match') {
      const answerIndex = q.candidates.findIndex(candidate => candidate.id === q.answerId)
      await page.getByRole('button', { name: `候補 ${answerIndex + 1}`, exact: false }).click()
    }
    await page.getByRole('button', { name: 'こたえあわせ' }).click()
    await expect(page.locator('.geometry-explanation')).toBeVisible()
    await page.getByRole('button', { name: index === 4 ? 'けっかをみる' : 'つぎへ' }).click()
  }
  const repeated = await read()
  expect(repeated.progress.history.filter((record: { appId: string }) => record.appId === 'geometry')).toHaveLength(2)
  expect(repeated.progress.rewards.treasure.filter((reward: string) => reward === 'treasure:shape-match-circle')).toHaveLength(1)
})
