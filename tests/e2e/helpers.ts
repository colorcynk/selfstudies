import { expect, type Page } from '@playwright/test'
import { PRODUCTS } from '../../src/apps/shopping/data/products'
import { SHOPPING_QUESTS } from '../../src/apps/shopping/data/quests'
import { NORMAL_STAGES } from '../../src/apps/kanji/data/normal'
import { READING_DIFFERENCE_SENTENCES } from '../../src/apps/kanji/data/readingDifference'
import type { Operation } from '../../src/apps/calculation/domain'

export const go = async (page: Page, route = '/') => page.goto(`/#${route}`)
export const gameButton = (page: Page, name: RegExp) => page.getByRole('button', { name })
export async function enterNumber(page: Page, answer: number) {
  await page.getByRole('textbox').first().fill(String(answer))
  await gameButton(page, /^(こたえる|こたえる\s|このかごで決定)/).click()
}
export async function finishMonster(page: Page, table = 1) {
  await go(page, '/monsters')
  if (await gameButton(page, /だんをえらぶ/).count()) await gameButton(page, /だんをえらぶ/).click()
  if (await gameButton(page, /べつのだんへ/).count()) await gameButton(page, /べつのだんへ/).click()
  await gameButton(page, new RegExp(`${table} のだん`)).first().click()
  for (let i = 0; i < 9; i++) {
    const equation = await page.locator('.equation').innerText()
    const [, left, right] = equation.match(/(\d+)\s*×\s*(\d+)/) ?? []
    await enterNumber(page, Number(left) * Number(right))
    if (i < 8) await gameButton(page, /つぎのもんだいへ/).click()
  }
}
export async function finishShopping(page: Page, questIndex: number, wrong = false) {
  const quest = SHOPPING_QUESTS[questIndex]!
  await go(page, '/shopping')
  if (!(await page.locator('.shop-play').count())) {
    if (await gameButton(page, /もういちどあそぶ/).count()) await gameButton(page, /ほかのおつかいへ/).click()
    await page.locator('.shop-quest').nth(questIndex).click()
  }
  for (const product of PRODUCTS) {
    const quantity = quest.basket.find(item => item.productId === product.id)?.quantity ?? 0
    for (let i = 0; i < quantity; i++) await gameButton(page, new RegExp(`${product.name}を1.+ふやす`)).click()
  }
  if (wrong) {
    const product = PRODUCTS.find(item => quest.basket.some(line => line.productId === item.id && line.quantity > 0))!
    await gameButton(page, new RegExp(`${product.name}を1.+へらす`)).click()
    await gameButton(page, /このかごで決定/).click()
    await expect(page.getByText(/かごをなおそう/)).toBeVisible()
    await gameButton(page, new RegExp(`${product.name}を1.+ふやす`)).click()
  }
  await gameButton(page, /このかごで決定/).click()
  await gameButton(page, /計算へすすむ/).click()
  if (quest.multiplication) {
    const m = quest.multiplication
    const product = PRODUCTS.find(item => item.id === m.productId)!
    await enterNumber(page, m.operation === 'count' ? product.countPerPack! * m.factor : product.priceYen * m.factor)
    await gameButton(page, /つぎへすすむ/).click()
  }
  const total = quest.basket.reduce((sum, line) => sum + PRODUCTS.find(p => p.id === line.productId)!.priceYen * line.quantity, 0)
  if (wrong) {
    await page.getByRole('textbox').first().fill(String(total + 1))
    await gameButton(page, /^こたえる$/).click()
    await expect(page.getByText(/もういちど考えてみよう/)).toBeVisible()
    await gameButton(page, /ヒントを見る/).click()
    await expect(page.getByText(/円を|円を\d/)).toBeVisible()
  }
  await enterNumber(page, total)
  await gameButton(page, /つぎへすすむ/).click()
  await enterNumber(page, quest.paidYen - total)
  await gameButton(page, /つぎへすすむ/).click()
  await expect(page.getByText(/おつかい クリア/)).toBeVisible()
}
async function answerNormalQuestion(page: Page, grade: number, stageIndex: number, questionIndex: number, wrongFirst = false) {
  const question = NORMAL_STAGES.filter(stage => stage.grade === grade)[stageIndex]!.questions[questionIndex]!
  await page.getByRole('button', { name: question.answer, exact: true }).click()
  if (wrongFirst) {
    const wrongChoice = question.choices.find(choice => choice !== question.answer)!
    await page.getByRole('button', { name: wrongChoice, exact: true }).click()
    await gameButton(page, /こたえをチェック/).click()
    await expect(page.getByText(/もう一度|ヒント/).first()).toBeVisible()
    await page.getByRole('button', { name: question.answer, exact: true }).click()
  }
  await gameButton(page, /こたえをチェック|もう一度こたえる/).click()
  await gameButton(page, /つぎの問題へ|結果を見る/).click()
}
export async function completeKanji(page: Page, grade: number, stageIndex: number, makeWrong = false) {
  if (await page.getByRole('button', { name: /べつのたんけんへ/ }).count()) await gameButton(page, /べつのたんけんへ/).click()
  await go(page, '/kanji')
  await gameButton(page, new RegExp(`小学${grade}年生`)).click()
  await gameButton(page, /ふつうの かん字たんけん/).click()
  await page.locator('.kanji-stages button').nth(stageIndex).click()
  for (let i = 0; i < 5; i++) await answerNormalQuestion(page, grade, stageIndex, i, makeWrong && i === 0)
  await expect(page.getByText(/たんけんクリア/)).toBeVisible()
}
export async function completeDifference(page: Page) {
  if (await gameButton(page, /べつのたんけんへ/).count()) await gameButton(page, /べつのたんけんへ/).click()
  // The kanji book keeps the same hash route. Return to its selector before
  // navigating to /kanji so Playwright does not remain on the book screen.
  if (await gameButton(page, /^もどる$/).count()) await gameButton(page, /^もどる$/).click()
  await go(page, '/kanji')
  await gameButton(page, /よみわけ探検/).click()
  for (let i = 0; i < READING_DIFFERENCE_SENTENCES.length; i++) {
    const sentence = READING_DIFFERENCE_SENTENCES[i]!
    if (i === 0) {
      for (let targetIndex = 0; targetIndex < sentence.targets.length; targetIndex++) {
        const target = sentence.targets[targetIndex]!
        const wrongChoice = target.choices.find(value => value !== target.answer)!
        await page.locator('.kanji-target-group').nth(targetIndex).getByRole('button', { name: wrongChoice, exact: true }).click()
      }
      await gameButton(page, /こたえをチェック/).click()
      await expect(page.getByText(/もう一度えらんでね/)).toHaveCount(2)
      for (let targetIndex = 0; targetIndex < sentence.targets.length; targetIndex++) {
        const target = sentence.targets[targetIndex]!
        await page.locator('.kanji-target-group').nth(targetIndex).getByRole('button', { name: target.answer, exact: true }).click()
      }
    }
    for (let targetIndex = 0; targetIndex < sentence.targets.length; targetIndex++) {
      const target = sentence.targets[targetIndex]!
      const group = page.locator('.kanji-target-group').nth(targetIndex)
      if (i === 0) break
      await group.getByRole('button', { name: target.answer, exact: true }).click()
      if (i === 1 && targetIndex === 0) {
        await page.locator('.kanji-target-group').nth(1).getByRole('button', { name: sentence.targets[1]!.choices.find(value => value !== sentence.targets[1]!.answer)!, exact: true }).click()
        await gameButton(page, /こたえをチェック/).click()
        await expect(page.getByText(/せいかい！この答えでロック/)).toBeVisible()
        await expect(group).toHaveAttribute('disabled', '')
        await page.locator('.kanji-target-group').nth(1).getByRole('button', { name: sentence.targets[1]!.answer, exact: true }).click()
      }
    }
    await gameButton(page, /こたえをチェック/).click()
    await gameButton(page, /つぎの文へ|結果を見る/).click()
  }
  await expect(page.getByText(/たんけんクリア/)).toBeVisible()
}
export async function finishCalc(page: Page, operation: Operation, size: 10 | 25 | 100, timed = false, wrong = false) {
  await go(page, '/calculation')
  if (await gameButton(page, /べつの計算をえらぶ/).count()) await gameButton(page, /べつの計算をえらぶ/).click()
  const opName = operation === 'addition' ? 'たし算' : operation === 'subtraction' ? 'ひき算' : 'かけ算'
  await gameButton(page, new RegExp(opName)).click(); await gameButton(page, new RegExp(`${size}問|${size}ます`)).click()
  await page.getByRole('checkbox', { name: /時間をはかる/ }).setChecked(timed)
  await gameButton(page, /計算をはじめる/).click()
  for (let i = 0; i < size; i++) {
    const label = await page.locator(`#cell-${i}`).getAttribute('aria-label') ?? ''
    const numbers = label.match(/たて(\d+).*よこ(\d+).*答え/)
    expect(numbers, `visible cell ${i} label`).not.toBeNull()
    const row = Number(numbers![1]), column = Number(numbers![2])
    const answer = operation === 'addition' ? row + column : operation === 'subtraction' ? row - column : row * column
    await page.locator(`#cell-${i}`).fill(String(wrong && i === 0 ? answer + 1 : answer))
    await page.locator(`#cell-${i}`).press('Enter')
  }
  await gameButton(page, /答えあわせ/).click()
  if (wrong) {
    await expect(page.getByText(/なおそう/).first()).toBeVisible()
    const firstLabel = await page.locator('#cell-0').getAttribute('aria-label') ?? ''
    const [, row, column] = firstLabel.match(/たて(\d+).*よこ(\d+).*答え/) ?? []
    const corrected = operation === 'addition' ? Number(row) + Number(column) : operation === 'subtraction' ? Number(row) - Number(column) : Number(row) * Number(column)
    await page.locator('#cell-0').fill(String(corrected))
    await gameButton(page, /なおした答えをチェック/).click()
  }
  await expect(page.getByRole('heading', { name: /よくがんばったね/ })).toBeVisible()
}
