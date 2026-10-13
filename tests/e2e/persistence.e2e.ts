import { expect, test, type Page } from '@playwright/test'
import { finishMonster, go } from './helpers'
import { STORAGE_KEY } from '../../src/shared/progress/types'

const otherStorageKey = 'persistence-test.keep'

async function seedProgress(page: Page, raw: string) {
  await go(page, '/settings')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, raw])
  await page.reload()
}

async function finishStartedMonster(page: Page) {
  for (let question = 0; question < 9; question++) {
    const equation = await page.locator('.equation').innerText()
    const match = equation.match(/(\d+)\s*×\s*(\d+)/)
    expect(match, 'visible monster equation').not.toBeNull()
    const answer = Number(match![1]) * Number(match![2])
    await page.getByRole('textbox').first().fill(String(answer))
    await page.getByRole('button', { name: 'こたえる', exact: true }).click()
    if (question < 8) await page.getByRole('button', { name: /つぎのもんだいへ/ }).click()
  }
  await expect(page.getByRole('heading', { name: /が なかまになったよ/ })).toBeVisible()
}

test('B8 corrupt JSON falls back to playable progress', async ({ page }) => {
  await seedProgress(page, '{not-json')
  await expect(page.getByRole('status').filter({ hasText: '前の記録を読みこめませんでした。新しい記録であそべます。' })).toBeVisible()

  await finishMonster(page, 1)
  await page.getByRole('button', { name: /ずかんをみる/ }).click()
  await expect(page.getByRole('heading', { name: 'なかまは 1 / 9 ひき' })).toBeVisible()
  await go(page, '/settings')
  await expect(page.getByText(/さいきんのきろく：1回 ・ あつめたもの：1こ/)).toBeVisible()
})

test('B8 malformed version 1 schema falls back to playable progress', async ({ page }) => {
  const malformed = JSON.stringify({ version: 1, progress: { history: [], rewards: { monster: [] } } })
  await seedProgress(page, malformed)
  await expect(page.getByRole('status').filter({ hasText: '前の記録を読みこめませんでした。新しい記録であそべます。' })).toBeVisible()

  await finishMonster(page, 1)
  await page.getByRole('button', { name: /ずかんをみる/ }).click()
  await expect(page.getByRole('heading', { name: 'なかまは 1 / 9 ひき' })).toBeVisible()
  await go(page, '/settings')
  await expect(page.getByText(/さいきんのきろく：1回 ・ あつめたもの：1こ/)).toBeVisible()
})

test('B8 null extra reward field is rejected safely and a real completion replaces it', async ({ page }) => {
  const malformed = JSON.stringify({
    version: 1,
    progress: { history: [], rewards: { monster: [], stamp: [], treasure: [], extra: null }, bestTimes: {} },
  })
  await seedProgress(page, malformed)
  await go(page)
  await expect(page.getByRole('status').filter({ hasText: '前の記録を読みこめませんでした。新しい記録であそべます。' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /なにしてあそぶ/ })).toBeVisible()

  await finishMonster(page, 1)
  const raw = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)
  expect(raw).not.toBeNull()
  expect(raw).not.toBe(malformed)
  const saved = JSON.parse(raw!)
  expect(saved.version).toBe(1)
  expect(saved.progress.history).toHaveLength(1)
  expect(saved.progress.history[0]).toMatchObject({ appId: 'monsters', stageId: 'monsters:dan-1', questionCount: 9 })
  expect(saved.progress.rewards.monster).toContain('monster:dan-1')
})

test('B8 unknown storage version stays byte-for-byte unchanged after a real completion', async ({ page }) => {
  const unknown = JSON.stringify({ version: 777, marker: 'preserve exactly' })
  await seedProgress(page, unknown)
  await expect(page.getByRole('status').filter({ hasText: 'この記録は今のアプリでは読み書きできません。' })).toBeVisible()

  await finishMonster(page, 3)
  await expect(page.getByRole('button', { name: /ずかんをみる/ })).toBeVisible()
  await page.getByRole('button', { name: /ずかんをみる/ }).click()
  await expect(page.getByRole('heading', { name: 'なかまは 1 / 9 ひき' })).toBeVisible()
  await go(page, '/settings')
  await expect(page.getByText(/さいきんのきろく：1回 ・ あつめたもの：1こ/)).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(unknown)
})

test('B8 unavailable localStorage getter leaves a real completed run playable in memory', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('blocked', 'SecurityError') },
  }))
  await go(page, '/monsters')
  await finishMonster(page, 2)

  await expect(page.getByRole('status').filter({ hasText: '記録を保存できませんが、あそびは続けられます。' })).toBeVisible()
  await page.getByRole('button', { name: /ずかんをみる/ }).click()
  await expect(page.getByRole('heading', { name: 'なかまは 1 / 9 ひき' })).toBeVisible()
  await go(page, '/settings')
  await expect(page.getByText(/さいきんのきろく：1回 ・ あつめたもの：1こ/)).toBeVisible()
})

test('B8 quota-only write failure after game start keeps the completed reward in memory', async ({ page }) => {
  await go(page, '/monsters')
  await page.getByRole('button', { name: /1 のだん/ }).first().click()
  await page.evaluate(key => {
    const originalSetItem = Storage.prototype.setItem
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value(this: Storage, itemKey: string, value: string) {
        if (itemKey === key) throw new DOMException('quota', 'QuotaExceededError')
        return Reflect.apply(originalSetItem, this, [itemKey, value])
      },
    })
  }, STORAGE_KEY)
  await finishStartedMonster(page)

  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull()
  await expect(page.getByRole('status').filter({ hasText: '記録を保存できませんが、あそびは続けられます。' })).toBeVisible()
  await page.getByRole('button', { name: /ずかんをみる/ }).click()
  await expect(page.getByRole('heading', { name: 'なかまは 1 / 9 ひき' })).toBeVisible()
  await go(page, '/settings')
  await expect(page.getByText(/さいきんのきろく：1回 ・ あつめたもの：1こ/)).toBeVisible()
})

test('B8 completed history and collection survive reload', async ({ page }) => {
  await finishMonster(page, 1)
  const raw = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)
  expect(raw).not.toBeNull()
  const saved = JSON.parse(raw!)
  expect(saved.progress.history).toHaveLength(1)
  expect(saved.progress.rewards.monster).toContain('monster:dan-1')

  await page.getByRole('button', { name: /ずかんをみる/ }).click()
  await expect(page.getByRole('heading', { name: 'なかまは 1 / 9 ひき' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /ずかんをみる/ }).click()
  await expect(page.getByRole('heading', { name: 'なかまは 1 / 9 ひき' })).toBeVisible()
  await go(page, '/settings')
  await expect(page.getByText(/さいきんのきろく：1回 ・ あつめたもの：1こ/)).toBeVisible()
})

test('B8 reset cancel preserves this app record and confirmation removes only its storage key', async ({ page }) => {
  await finishMonster(page, 1)
  const original = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)
  expect(original).not.toBeNull()
  await page.evaluate(key => localStorage.setItem(key, 'keep-me'), otherStorageKey)
  await go(page, '/settings')

  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: /記録をぜんぶ消す/ }).click()
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(original)
  expect(await page.evaluate(key => localStorage.getItem(key), otherStorageKey)).toBe('keep-me')

  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: /記録をぜんぶ消す/ }).click()
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull()
  expect(await page.evaluate(key => localStorage.getItem(key), otherStorageKey)).toBe('keep-me')
  await expect(page.getByText(/さいきんのきろく：0回 ・ あつめたもの：0こ/)).toBeVisible()
})
