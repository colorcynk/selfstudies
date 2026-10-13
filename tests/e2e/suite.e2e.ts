import { expect, test } from '@playwright/test'
import { SHOPPING_QUESTS } from '../../src/apps/shopping/data/quests'
import { NORMAL_STAGES } from '../../src/apps/kanji/data/normal'
import { READING_DIFFERENCE_SENTENCES } from '../../src/apps/kanji/data/readingDifference'
import { STORAGE_KEY } from '../../src/shared/progress/types'
import { CATALOG } from '../../src/shared/progress/catalog'
import { completeDifference, completeKanji, enterNumber, finishCalc, finishMonster, finishShopping, gameButton, go } from './helpers'

test('B1 routes, browser history and direct URLs', async ({ page }) => {
  await go(page)
  for (const [route, title] of [['/monsters','九九モンスター'], ['/shopping','おかいものクエスト'], ['/kanji','かん字たんけん隊'], ['/calculation','100ます計算']] as const) {
    await page.getByRole('button', { name: new RegExp(title) }).click()
    await expect(page).toHaveURL(new RegExp(`#${route}$`))
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.goBack(); await expect(page.getByRole('heading', { name: /なにしてあそぶ/ })).toBeVisible()
    await page.goForward(); await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await go(page)
  }
  await go(page, '/settings'); await expect(page.getByRole('heading', { name: 'おうちの人の設定' })).toBeVisible()
  for (const hash of ['/#/unknown', '/#toString', '/#constructor', '/#unknown']) {
    await page.goto(hash); await expect(page.getByRole('heading', { name: /なにしてあそぶ/ })).toBeVisible()
  }
})

test('B2/B11 monsters retry, native Enter boundaries, collection, reload and interrupted run', async ({ page }) => {
  await go(page, '/monsters'); await gameButton(page, /1 のだん/).first().click()
  let equation = await page.locator('.equation').innerText(); let [, a, b] = equation.match(/(\d+)\s*×\s*(\d+)/) ?? []
  await enterNumber(page, Number(a) * Number(b) + 1); await gameButton(page, /ヒントをみる/).click(); await expect(page.getByText(/かい たす/)).toBeVisible()
  equation = await page.locator('.equation').innerText(); [, a, b] = equation.match(/(\d+)\s*×\s*(\d+)/) ?? []
  await page.getByRole('textbox').fill(String(Number(a) * Number(b)))
  await gameButton(page, /^こたえる$/).click()
  const advance = gameButton(page, /つぎのもんだいへ/)
  await advance.focus()
  await page.keyboard.down('Enter'); await page.keyboard.down('Enter'); await page.keyboard.up('Enter')
  await expect(page.locator('.equation')).not.toHaveText(new RegExp(`${Number(a)}\\s*×\\s*${Number(b)}`))
  // Leave the next answer blank: native key repeat must not submit it at the boundary.
  const qAfter = await page.locator('.equation').innerText()
  await expect(page.getByText(/もういちど|ヒント：/)).toHaveCount(0)
  expect(qAfter).toContain('= ?')
  await page.getByRole('button', { name: /やめる/ }).click()
  await gameButton(page, /ずかんをみる/).click(); await expect(page.getByText(/なかまは 0 \/ 9/)).toBeVisible()
  await page.reload(); await expect(page.getByRole('heading', { name: /九九モンスター/ })).toBeVisible()
  await finishMonster(page, 1)
  await expect(page.getByText(/はじめに せいかいしたのは 9 \/ 9/)).toBeVisible()
  await gameButton(page, /ずかんをみる/).click()
  await expect(page.getByText(/なかまは 1 \/ 9/)).toBeVisible()
  await gameButton(page, /だんをえらぶ/).click()
  await finishMonster(page, 1)
  await gameButton(page, /ずかんをみる/).click()
  await expect(page.getByText(/なかまは 1 \/ 9/)).toBeVisible()
  const monsterSaved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))!)
  expect(monsterSaved.progress.history.filter((record: { appId: string }) => record.appId === 'monsters')).toHaveLength(2)
})

test('B3 shopping basket, count/money quests, rewards and incomplete session', async ({ page }) => {
  await go(page, '/shopping'); await page.locator('.shop-quest').first().click()
  await gameButton(page, /このかごで決定/).click(); await expect(page.getByText(/かごをなおそう/)).toBeVisible()
  await page.getByRole('button', { name: /クエストをやめる/ }).click()
  await gameButton(page, /スタンプを見る/).click(); await expect(page.getByText(/0 \/ 6 こ/)).toBeVisible()
  await gameButton(page, /クエストをえらぶ/).click()
  await finishShopping(page, 0, true); await gameButton(page, /スタンプを見る/).click(); await expect(page.getByText(/1 \/ 6 こ/)).toBeVisible()
  await gameButton(page, /クエストをえらぶ/).click()
  await finishShopping(page, 4); await expect(page.getByText(/はじめに正解した数 3 \/ 3/)).toBeVisible()
  await gameButton(page, /もういちどあそぶ/).click()
  await finishShopping(page, 4)
  await gameButton(page, /ほかのおつかいへ/).click()
  await finishShopping(page, 5); await expect(page.getByText(/はじめに正解した数 3 \/ 3/)).toBeVisible()
  await page.reload(); await expect(page.getByRole('button', { name: /3\/6/ })).toBeVisible()
})

test('B4/B5 normal kanji both grades and reading-difference independent targets/rewards', async ({ page }) => {
  test.setTimeout(120_000)
  await completeKanji(page, 2, 0, true)
  await expect(page.getByText(/はじめてのチェックで 4 \/ 5/)).toBeVisible()
  await completeKanji(page, 3, 0)
  await completeDifference(page)
  await expect(page.getByText(/はじめてのチェックで 3 \/ 5/)).toBeVisible()
  await gameButton(page, /宝もの図かんを見る/).click()
  await expect(page.getByText(/よみわけ探検/)).toBeVisible()
  await page.reload(); await expect(page.getByRole('heading', { name: /かん字たんけん隊/ })).toBeVisible()
})

test('B6 all nine calculation grids complete through the real interface', async ({ page }) => {
  test.setTimeout(240_000)
  for (const op of ['addition','subtraction','multiplication'] as const) for (const size of [10,25,100] as const) {
    // Each operation/size pair is selected and completed through its displayed grid.
    await finishCalc(page, op, size, op === 'addition' && size === 10, op === 'addition' && size === 10)
    if (op === 'addition' && size === 10) await expect(page.getByText(/この記録がこのコースの自己ベスト/)).toHaveCount(0)
  }
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))!)
  expect(saved.progress.history.filter((record: { appId: string }) => record.appId === 'calculation')).toHaveLength(9)
})

test('B6 rejects blank, negative, decimal and text cells while zero remains valid', async ({ page }) => {
  await go(page, '/calculation'); await gameButton(page, /計算をはじめる/).click()
  await gameButton(page, /答えあわせ/).click()
  await expect(page.getByText(/まだ 10 ますに答えが入っていない/)).toBeVisible()
  for (let i = 0; i < 10; i++) {
    const label = await page.locator('#cell-' + i).getAttribute('aria-label') ?? ''
    const [, row, column] = label.match(/たて(\d+).*よこ(\d+).*答え/) ?? []
    const correct = Number(row) + Number(column)
    await page.locator('#cell-' + i).fill(i === 0 ? '-1' : i === 1 ? '1.5' : i === 2 ? 'text' : String(correct))
  }
  await gameButton(page, /答えあわせ/).click()
  await expect(page.getByText(/まだ 3 ますに答えが入っていない/)).toBeVisible()
  await expect(page.locator('#cell-3')).toHaveValue(/^\d+$/)
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBeNull()
})

test('B7 timed wrong correction is ineligible; timed bests stay separated and interruption adds no record', async ({ page }) => {
  await finishCalc(page, 'addition', 10, true, true)
  await expect(page.getByText(/この記録がこのコースの自己ベスト/)).toHaveCount(0)
  await finishCalc(page, 'addition', 10, true)
  await expect(page.getByText(/自己ベストだよ/)).toBeVisible()
  await finishCalc(page, 'multiplication', 10, true)
  await expect(page.getByText(/自己ベストだよ/)).toBeVisible()
  await gameButton(page, /べつの計算をえらぶ/).click()
  await page.getByRole('checkbox', { name: /時間をはかる/ }).setChecked(true)
  await gameButton(page, /計算をはじめる/).click()
  await page.locator('#cell-0').fill('0')
  await gameButton(page, /やめてえらびなおす/).click()
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))!)
  expect(saved.progress.history.filter((record: { appId: string }) => record.appId === 'calculation')).toHaveLength(3)
  expect(Object.keys(saved.progress.bestTimes)).toEqual(expect.arrayContaining(['addition-10', 'multiplication-10']))
  expect(Object.keys(saved.progress.bestTimes)).not.toContain('subtraction-10')
})

test('B12 production catalog agrees with actual content fixtures and completion records', async ({ page }) => {
  const actual = [
    ...Array.from({ length: 9 }, (_, i) => ({ appId: 'monsters', modeId: 'kuku', stageId: `monsters:dan-${i + 1}`, questionCount: 9 })),
    ...SHOPPING_QUESTS.map(quest => ({ appId: 'shopping', modeId: quest.modeId, stageId: quest.id, questionCount: quest.multiplication ? 3 : 2 })),
    ...NORMAL_STAGES.map(stage => ({ appId: 'kanji', modeId: 'standard', stageId: stage.id, questionCount: stage.questions.length })),
    { appId: 'kanji', modeId: 'reading-difference', stageId: 'kanji:reading-difference-01', questionCount: READING_DIFFERENCE_SENTENCES.length },
    ...(['addition','subtraction','multiplication'] as const).flatMap(operation => ([10,25,100] as const).map(size => ({ appId: 'calculation', modeId: operation, stageId: `calculation:${operation}-${size}`, questionCount: size }))),
  ]
  expect(actual).toHaveLength(33)
  expect(CATALOG.map(({ appId, modeId, stageId, questionCount }) => ({ appId, modeId, stageId, questionCount }))).toEqual(actual)
  expect(new Set(CATALOG.filter(entry => entry.appId === 'kanji').map(entry => entry.reward?.id)).size).toBe(9)
  await finishShopping(page, 5)
  await finishCalc(page, 'multiplication', 10)
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))!)
  for (const record of saved.progress.history) {
    const catalogEntry = CATALOG.find(entry => entry.appId === record.appId && entry.modeId === record.modeId && entry.stageId === record.stageId)
    expect(catalogEntry).toBeTruthy()
    expect(record.questionCount).toBe(catalogEntry!.questionCount)
  }
  expect(saved.progress.history.some((record: { appId: string; modeId: string }) => record.appId === 'shopping' && record.modeId === 'multiplication-money')).toBeTruthy()
  expect(saved.progress.history.some((record: { appId: string; modeId: string; size?: number }) => record.appId === 'calculation' && record.modeId === 'multiplication' && record.size === 10)).toBeTruthy()
})
