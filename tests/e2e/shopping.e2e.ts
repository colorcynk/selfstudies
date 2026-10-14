import { expect, test } from '@playwright/test'
import { SHOPPING_QUESTS } from '../../src/apps/shopping/data/quests'
import { STORAGE_KEY } from '../../src/shared/progress/types'
import { finishShopping, gameButton, go } from './helpers'

for (const [index, quest] of SHOPPING_QUESTS.entries()) {
  test(`${quest.id} completes with a full score and preserves its stamp after reload`, async ({ page }) => {
    await finishShopping(page, index)
    const questionCount = quest.multiplication ? 3 : 2
    await expect(page.locator('.shop-score')).toContainText(`${questionCount} / ${questionCount}`)
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
    expect(saved.progress.history).toHaveLength(1)
    expect(saved.progress.history[0]).toMatchObject({ stageId: quest.id, modeId: quest.modeId, questionCount, firstCorrectCount: questionCount })
    expect(saved.progress.rewards.stamp).toEqual([`stamp:${quest.id.replace('shopping:', '')}`])
    await page.reload()
    await expect(page.locator('.shop-quest')).toHaveCount(15)
    await expect(gameButton(page, /スタンプを見る/)).toContainText('1/15')
    await expect(page.locator('.shop-quest').nth(index)).toContainText('クリアずみ')
  })
}

for (const width of [375, 768, 1280]) {
  test(`all 15 quests and stamps fit the ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/shopping')
    await expect(page.locator('.shop-quest')).toHaveCount(15)
    await expect(page.locator('.shop-quest-icon')).toHaveText(Array(15).fill(/\S+/))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.locator('.shop-quest').last().scrollIntoViewIfNeeded()
    await expect(page.locator('.shop-quest').last()).toBeVisible()
    await gameButton(page, /スタンプを見る/).click()
    await expect(page.locator('.shop-stamp')).toHaveCount(15)
    await expect(page.getByText('0 / 15 こ あつまったよ！')).toBeVisible()
    await page.locator('.shop-stamp').last().scrollIntoViewIfNeeded()
    await expect(page.locator('.shop-stamp').last()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('original six stamps stay visible and a new quest adds a seventh stamp', async ({ page }) => {
  const originalQuests = SHOPPING_QUESTS.slice(0, 6)
  const history = originalQuests.map(quest => ({
    sessionId: `original-${quest.id}`, appId: 'shopping', modeId: quest.modeId, stageId: quest.id,
    questionCount: quest.multiplication ? 3 : 2, firstCorrectCount: quest.multiplication ? 3 : 2,
    completedAt: '2026-10-13T00:00:00.000Z',
  }))
  const stamps = originalQuests.map(quest => `stamp:${quest.id.replace('shopping:', '')}`)
  await go(page)
  await page.evaluate(({ key, history, stamps }) => localStorage.setItem(key, JSON.stringify({
    version: 1, progress: { history, rewards: { monster: [], stamp: stamps, treasure: [] }, bestTimes: {} },
  })), { key: STORAGE_KEY, history, stamps })
  await page.reload()
  await go(page, '/shopping')
  await expect(gameButton(page, /スタンプを見る/)).toContainText('6/15')
  await expect(page.locator('.shop-quest.is-owned')).toHaveCount(6)
  await finishShopping(page, 14)
  await page.reload()
  await expect(gameButton(page, /スタンプを見る/)).toContainText('7/15')
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
  expect(saved.progress.history.slice(0, 6)).toEqual(history)
  expect(saved.progress.rewards.stamp).toEqual([...stamps, 'stamp:quest-15'])
})
