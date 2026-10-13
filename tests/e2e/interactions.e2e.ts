import { expect, test, type Locator, type Page } from '@playwright/test'
import { NORMAL_STAGES } from '../../src/apps/kanji/data/normal'
import { READING_DIFFERENCE_SENTENCES } from '../../src/apps/kanji/data/readingDifference'
import { PRODUCTS } from '../../src/apps/shopping/data/products'
import { SHOPPING_QUESTS } from '../../src/apps/shopping/data/quests'
import { STORAGE_KEY } from '../../src/shared/progress/types'
import { gameButton, go } from './helpers'

async function burst(locator: Locator, count = 4) {
  await locator.evaluate((element, presses) => {
    for (let i = 0; i < presses; i++) (element as HTMLButtonElement).click()
  }, count)
}

async function savedProgress(page: Page) {
  const raw = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)
  return raw ? JSON.parse(raw).progress as { history: { appId: string; firstCorrectCount: number; stageId: string }[]; rewards: { stamp: string[]; treasure: string[] } } : null
}

test('shopping submit/continue bursts keep each visible step and award once at completion', async ({ page }) => {
  const quest = SHOPPING_QUESTS[0]!
  const apple = PRODUCTS.find(product => product.id === 'apple')!
  await go(page, '/shopping')
  await page.locator('.shop-quest').nth(0).click()
  const addApple = page.getByRole('button', { name: new RegExp(`${apple.name}を1${apple.unit}ふやす`) })
  await addApple.click()
  await addApple.click()
  await burst(gameButton(page, /このかごで決定/))
  await expect(page.getByText(/ぴったり！ かごができたよ/)).toBeVisible()
  expect(await savedProgress(page)).toBeNull()
  await burst(gameButton(page, /計算へすすむ/))
  await expect(page.getByRole('heading', { name: 'ぜんぶでいくら？' })).toBeVisible()

  const total = quest.basket.reduce((sum, line) => sum + PRODUCTS.find(item => item.id === line.productId)!.priceYen * line.quantity, 0)
  const answer = page.getByRole('textbox').first()
  await answer.fill(String(total))
  await answer.focus()
  await page.keyboard.down('Enter'); await page.keyboard.down('Enter'); await page.keyboard.up('Enter')
  await expect(page.getByText(/せいかい！ つぎはおつり/)).toBeVisible()
  await burst(gameButton(page, /つぎへすすむ/))
  await expect(page.getByRole('heading', { name: 'おつりはいくら？', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox').first()).toHaveValue('')
  await answer.fill(String(total)) // Stale answer from the previous question is deliberately submitted.
  await burst(gameButton(page, /^こたえる$/))
  await expect(page.getByText(/もういちど考えてみよう/)).toBeVisible()
  expect(await savedProgress(page)).toBeNull()

  await answer.fill(String(quest.paidYen - total))
  await burst(gameButton(page, /^こたえる$/))
  await burst(gameButton(page, /つぎへすすむ/))
  await expect(page.getByText(/おつかい クリア/)).toBeVisible()
  await expect(page.getByText(/はじめに正解した数\s*1\s*\/\s*2/)).toBeVisible()
  const progress = await savedProgress(page)
  expect(progress?.history.filter(record => record.stageId === quest.id)).toHaveLength(1)
  expect(progress?.history.find(record => record.stageId === quest.id)?.firstCorrectCount).toBe(1)
  expect(progress?.rewards.stamp).toContain('stamp:quest-01')
})

test('shopping held Enter never submits a blank next answer and records complete scores', async ({ page }) => {
  for (const questIndex of [0, 4, 5]) {
    const quest = SHOPPING_QUESTS[questIndex]!
    if (await gameButton(page, /ほかのおつかいへ/).count()) await gameButton(page, /ほかのおつかいへ/).click()
    await go(page, '/shopping')
    await page.locator('.shop-quest').nth(questIndex).click()
    for (const line of quest.basket) {
      const product = PRODUCTS.find(item => item.id === line.productId)!
      const add = page.getByRole('button', { name: new RegExp(`${product.name}を1${product.unit}ふやす`) })
      for (let quantity = 0; quantity < line.quantity; quantity++) await add.click()
    }

    const confirmBasket = gameButton(page, /このかごで決定/)
    await confirmBasket.focus()
    await page.keyboard.down('Enter')
    await expect(page.getByText(/ぴったり！ かごができたよ/)).toBeVisible()
    await page.keyboard.down('Enter')
    await expect(page.getByRole('heading', { name: 'かごをつくる' })).toBeVisible()
    await expect(gameButton(page, /計算へすすむ/)).toBeVisible()
    await page.keyboard.up('Enter')

    const firstStep = quest.multiplication ? 'multiply' : 'total'
    const questionHeading = firstStep === 'multiply' ? quest.multiplication!.question : 'ぜんぶでいくら？'
    await gameButton(page, /計算へすすむ/).focus()
    await page.keyboard.down('Enter')
    await expect(page.getByRole('heading', { name: questionHeading })).toBeVisible()
    await page.keyboard.down('Enter')
    await expect(page.getByRole('heading', { name: questionHeading })).toBeVisible()
    await expect(page.getByRole('textbox').first()).toHaveValue('')
    await expect(page.getByText(/もういちど考えてみよう/)).toHaveCount(0)
    await page.keyboard.up('Enter')

    const total = quest.basket.reduce((sum, line) => sum + PRODUCTS.find(item => item.id === line.productId)!.priceYen * line.quantity, 0)
    const firstAnswer = quest.multiplication
      ? quest.multiplication.operation === 'count'
        ? PRODUCTS.find(item => item.id === quest.multiplication!.productId)!.countPerPack! * quest.multiplication.factor
        : PRODUCTS.find(item => item.id === quest.multiplication!.productId)!.priceYen * quest.multiplication.factor
      : total
    const firstInput = page.getByRole('textbox').first()
    await firstInput.fill(String(firstAnswer))
    await firstInput.focus()
    await page.keyboard.down('Enter')
    await expect(page.getByText(/せいかい！/)).toBeVisible()
    await page.keyboard.down('Enter')
    await expect(page.getByRole('heading', { name: questionHeading })).toBeVisible()
    await expect(firstInput).toHaveValue(String(firstAnswer))
    await page.keyboard.up('Enter')

    const continueButton = gameButton(page, /つぎへすすむ/)
    await continueButton.focus()
    await page.keyboard.down('Enter')
    const secondStep = firstStep === 'multiply' ? 'total' : 'change'
    const secondHeading = secondStep === 'total' ? 'ぜんぶでいくら？' : 'おつりはいくら？'
    await expect(page.getByRole('heading', { name: secondHeading, exact: true })).toBeVisible()
    await page.keyboard.down('Enter')
    await expect(page.getByRole('heading', { name: secondHeading, exact: true })).toBeVisible()
    await expect(page.getByRole('textbox').first()).toHaveValue('')
    await expect(page.getByText(/もういちど考えてみよう/)).toHaveCount(0)
    await page.keyboard.up('Enter')

    const answerAndContinue = async (answer: number) => {
      await page.getByRole('textbox').first().fill(String(answer))
      await gameButton(page, /^こたえる$/).click()
      await expect(page.getByText(/せいかい！/)).toBeVisible()
      await gameButton(page, /つぎへすすむ/).click()
    }
    if (secondStep === 'total') await answerAndContinue(total)
    await answerAndContinue(quest.paidYen - total)
    await expect(page.getByText(new RegExp(`はじめに正解した数\\s*${quest.multiplication ? 3 : 2}\\s*/\\s*${quest.multiplication ? 3 : 2}`))).toBeVisible()
    const progress = await savedProgress(page)
    expect(progress?.history.filter(record => record.stageId === quest.id)).toHaveLength(1)
    expect(progress?.history.find(record => record.stageId === quest.id)?.firstCorrectCount).toBe(quest.multiplication ? 3 : 2)
    expect(progress?.rewards.stamp).toContain(`stamp:${quest.id.replace('shopping:', '')}`)
  }
})

test('normal kanji repeated checks and advances keep five first-attempt answers and one reward', async ({ page }) => {
  const stage = NORMAL_STAGES.find(item => item.grade === 2)!
  await go(page, '/kanji')
  await gameButton(page, /小学2年生/).click()
  await gameButton(page, /ふつうの かん字たんけん/).click()
  await page.locator('.kanji-stages button').first().click()
  for (let i = 0; i < stage.questions.length; i++) {
    const question = stage.questions[i]!
    await page.getByRole('button', { name: question.answer, exact: true }).click()
    await burst(gameButton(page, /こたえをチェック/))
    await expect(page.getByText(/せいかい！よくできたね/)).toBeVisible()
    expect(await savedProgress(page)).toBeNull()
    const advance = gameButton(page, /つぎの問題へ|結果を見る/)
    if (i === 0) {
      await advance.focus()
      await page.keyboard.down('Enter')
      await page.keyboard.down('Enter')
      await page.keyboard.up('Enter')
    } else await burst(advance)
    if (i < stage.questions.length - 1) {
      await expect(page.getByText(`もんだい ${i + 2} / 5`)).toBeVisible()
      await expect(page.locator('.kanji-choices button[aria-pressed="true"]')).toHaveCount(0)
      await expect(gameButton(page, /こたえをチェック/)).toBeDisabled()
    }
  }
  await expect(page.getByText(/はじめてのチェックで 5 \/ 5 問せいかい/)).toBeVisible()
  const progress = await savedProgress(page)
  expect(progress?.history.filter(record => record.appId === 'kanji')).toHaveLength(1)
  expect(progress?.history[0]?.firstCorrectCount).toBe(5)
  expect(progress?.rewards.treasure).toContain('treasure:g2-01')
})

test('reading-difference locks both correct targets, resets the next sentence, and records five once', async ({ page }) => {
  await go(page, '/kanji')
  await gameButton(page, /よみわけ探検/).click()
  for (let i = 0; i < READING_DIFFERENCE_SENTENCES.length; i++) {
    const sentence = READING_DIFFERENCE_SENTENCES[i]!
    for (let targetIndex = 0; targetIndex < sentence.targets.length; targetIndex++) {
      const target = sentence.targets[targetIndex]!
      await page.locator('.kanji-target-group').nth(targetIndex).getByRole('button', { name: target.answer, exact: true }).click()
    }
    await burst(gameButton(page, /こたえをチェック/))
    for (const group of await page.locator('.kanji-target-group').all()) await expect(group).toHaveAttribute('disabled', '')
    expect(await savedProgress(page)).toBeNull()
    const advance = gameButton(page, /つぎの文へ|結果を見る/)
    if (i === 0) {
      await advance.focus()
      await page.keyboard.down('Enter')
      await page.keyboard.down('Enter')
      await page.keyboard.up('Enter')
    } else await burst(advance)
    if (i < READING_DIFFERENCE_SENTENCES.length - 1) {
      await expect(page.getByText(`文 ${i + 2} / 5`)).toBeVisible()
      await expect(page.locator('.kanji-target-group button[aria-pressed="true"]')).toHaveCount(0)
      await expect(gameButton(page, /こたえをチェック/)).toBeDisabled()
    }
  }
  await expect(page.getByText(/はじめてのチェックで 5 \/ 5 問せいかい/)).toBeVisible()
  const progress = await savedProgress(page)
  expect(progress?.history.filter(record => record.appId === 'kanji')).toHaveLength(1)
  expect(progress?.history[0]?.firstCorrectCount).toBe(5)
  expect(progress?.rewards.treasure).toContain('treasure:reading-difference-01')
})

test('calculation Enter repeat moves once; grade, correction, and completion bursts preserve the first score', async ({ page }) => {
  await go(page, '/calculation')
  await gameButton(page, /たし算/).click()
  await gameButton(page, /10問/).click()
  await gameButton(page, /計算をはじめる/).click()

  const first = page.locator('#cell-0')
  const firstLabel = await first.getAttribute('aria-label') ?? ''
  const [, row, column] = firstLabel.match(/たて(\d+).*よこ(\d+).*答え/) ?? []
  const firstAnswer = Number(row) + Number(column)
  await first.fill(String(firstAnswer + 1))
  await first.focus()
  await page.keyboard.down('Enter'); await page.keyboard.down('Enter'); await page.keyboard.up('Enter')
  await expect(page.locator('#cell-1')).toBeFocused()
  await expect(first).toHaveValue(String(firstAnswer + 1))

  for (let i = 1; i < 10; i++) {
    const input = page.locator(`#cell-${i}`)
    const label = await input.getAttribute('aria-label') ?? ''
    const [, cellRow, cellColumn] = label.match(/たて(\d+).*よこ(\d+).*答え/) ?? []
    await input.fill(String(Number(cellRow) + Number(cellColumn)))
  }
  await burst(gameButton(page, /答えあわせ/))
  await expect(page.getByText(/なおそう/).first()).toBeVisible()
  expect(await savedProgress(page)).toBeNull()
  await first.fill(String(firstAnswer))
  await burst(gameButton(page, /なおした答えをチェック/))
  await expect(page.getByRole('heading', { name: /よくがんばったね/ })).toBeVisible()
  await expect(page.getByText(/はじめに正解したマス\s*9\s*\/\s*10/)).toBeVisible()
  await burst(gameButton(page, /べつの計算をえらぶ/)) // Completion action burst must not create a second record.
  const progress = await savedProgress(page)
  expect(progress?.history.filter(record => record.appId === 'calculation')).toHaveLength(1)
  expect(progress?.history[0]?.firstCorrectCount).toBe(9)
  expect(progress?.rewards.stamp).toHaveLength(0)
})
