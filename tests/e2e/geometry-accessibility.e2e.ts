import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GEOMETRY_STAGES } from '../../src/apps/geometry/data'
import { go } from './helpers'

test('Geometry supports keyboard-only completion, named controls, focus, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await go(page, '/geometry')
  await expect(page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).resolves.toBe(true)
  for (const stage of [GEOMETRY_STAGES[0]!, GEOMETRY_STAGES[6]!]) {
    await tabUntilFocused(page, page.getByRole('button', { name: new RegExp(stage.title) }))
    const initialButton = page.getByRole('button', { name: new RegExp(stage.title) })
    const transition = await initialButton.evaluate(element => getComputedStyle(element).transitionDuration)
    expect(transition.split(',').every(value => value.trim() === '0s')).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.locator('#geometry-instructions-title')).toBeFocused()
    await tabUntilFocused(page, page.getByRole('button', { name: 'はじめる' }))
    await page.keyboard.press('Enter')
    for (const question of stage.questions) {
      if (question.mode === 'match') {
        const answerIndex = question.candidates.findIndex(candidate => candidate.id === question.answerId)
        const candidates = page.getByRole('group', { name: '候補の図形' })
        await expect(candidates).toBeVisible()
        const visibleLabels = await candidates.getByRole('button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
        expect(visibleLabels).toEqual(question.candidates.map((_, index) => `候補 ${index + 1}`))
        await tabUntilFocused(page, page.getByRole('button', { name: `候補 ${answerIndex + 1}`, exact: false }))
        await page.keyboard.press('Enter')
        await expect(page.getByRole('button', { name: `候補 ${answerIndex + 1}`, exact: false })).toHaveAttribute('aria-pressed', 'true')
      } else {
        await tabUntilFocused(page, page.getByRole('textbox', { name: '見つけた数' }))
        await page.keyboard.type(String(question.solutions.length))
      }
      await tabUntilFocused(page, page.getByRole('button', { name: 'こたえあわせ' }))
      await page.keyboard.press('Enter')
      await expect(page.locator('#geometry-question-title')).toHaveText('こたえを たしかめよう')
      await expect(page.locator('#geometry-question-title')).toBeFocused()
      const explanation = page.locator('.geometry-explanation')
      await expect(explanation).toBeVisible()
      await expect(explanation.locator('h3')).toBeVisible()
      if (question.mode === 'count' && question.solutions.length > 1) {
        await tabUntilFocused(page, explanation.getByRole('button', { name: '次の輪郭' }))
        await page.keyboard.press('Enter')
        await expect(explanation.getByText(`2 / ${question.solutions.length}`)).toBeVisible()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Enter')
        await expect(explanation.getByText(`1 / ${question.solutions.length}`)).toBeVisible()
      }
      await tabUntilFocused(page, page.getByRole('button', { name: /つぎへ|けっかをみる/ }))
      await page.keyboard.press('Enter')
    }
    await expect(page.getByRole('heading', { name: 'よくがんばったね！' })).toBeVisible()
    if (stage.id !== GEOMETRY_STAGES[6]!.id) await page.getByRole('button', { name: 'ステージをえらぶ' }).click()
  }
})

async function tabUntilFocused(page: import('@playwright/test').Page, locator: import('@playwright/test').Locator) {
  for (let i = 0; i < 30; i++) {
    if (await locator.evaluate(element => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  await expect(locator).toBeFocused()
}

test('count input is named, rejects invalid values, and accepts zero', async ({ page }) => {
  const stage = GEOMETRY_STAGES.find(item => item.mode === 'count')!
  const zeroQuestion = stage.questions.find(question => question.mode === 'count' && question.solutions.length === 0)!
  await go(page, '/geometry')
  await page.getByRole('button', { name: new RegExp(stage.title) }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  const input = page.getByRole('textbox', { name: '見つけた数' })
  await expect(input).toBeVisible()
  const submit = page.getByRole('button', { name: 'こたえあわせ' })
  await page.getByRole('button', { name: '1', exact: true }).dblclick()
  await expect(input).toHaveValue('11')
  await page.getByRole('button', { name: 'けす', exact: true }).click()
  await expect(input).toHaveValue('')
  await expect(page.locator('.geometry-play-head')).toContainText('1 / 5')
  for (const value of ['', '-1', '1.5', 'abc']) {
    await input.fill(value)
    await submit.click()
    await expect(page.getByRole('status').filter({ hasText: '0以上の整数を入力してね。' })).toBeVisible()
    await expect(page.locator('.geometry-play-head')).toContainText('1 / 5')
  }
  // Select the known zero-count prompt through ordinary stage progression.
  for (let index = 0; index < stage.questions.indexOf(zeroQuestion); index++) {
    const current = stage.questions[index]!
    if (current.mode === 'count') await input.fill(String(current.solutions.length))
    await submit.click()
    await page.getByRole('button', { name: /つぎへ|けっかをみる/ }).click()
  }
  await input.fill('0')
  await submit.click()
  await expect(page.locator('.geometry-explanation')).toContainText('0こです')
  const zeroIndex = stage.questions.indexOf(zeroQuestion)
  await page.getByRole('button', { name: zeroIndex === 4 ? 'けっかをみる' : 'つぎへ' }).click()
  for (let index = zeroIndex + 1; index < stage.questions.length; index++) {
    const question = stage.questions[index]!
    if (question.mode !== 'count') throw new Error('expected count question')
    await input.fill(String(question.solutions.length))
    await submit.click()
    await expect(page.locator('.geometry-explanation')).toBeVisible()
    await page.getByRole('button', { name: index === 4 ? 'けっかをみる' : 'つぎへ' }).click()
  }
  await expect(page.locator('.geometry-score')).toContainText('5 / 5')
})

test('contour double-clicks step one contour at a time in both directions', async ({ page }) => {
  const stage = GEOMETRY_STAGES[7]!
  const question = stage.questions[0]!
  if (question.mode !== 'count' || question.solutions.length !== 5) throw new Error('expected five-contour count item')
  await go(page, '/geometry')
  await page.getByRole('button', { name: new RegExp(stage.title) }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  await page.getByRole('textbox', { name: '見つけた数' }).fill(String(question.solutions.length))
  await page.getByRole('button', { name: 'こたえあわせ' }).click()
  const explanation = page.locator('.geometry-explanation')
  await explanation.getByRole('button', { name: '次の輪郭' }).dblclick()
  await expect(explanation.getByText('3 / 5', { exact: true })).toBeVisible()
  await explanation.getByRole('button', { name: '前の輪郭' }).dblclick()
  await expect(explanation.getByText('1 / 5', { exact: true })).toBeVisible()
})

test('Geometry representative screens fit and retain named controls at 375, 768, and 1280 pixels', async ({ page }) => {
  test.setTimeout(180_000)
  await mkdir(resolve('docs/reviews/artifacts/geometry'), { recursive: true })
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await go(page, '/geometry')
    for (const stageIndex of [0, 6]) {
      const stage = GEOMETRY_STAGES[stageIndex]!
      await page.getByRole('button', { name: new RegExp(stage.title) }).click()
      await page.getByRole('button', { name: 'はじめる' }).click()
      await expect(page.getByRole('region', { name: `${stage.title} 1問目` })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await expect(page.getByRole('region', { name: `${stage.title} 1問目` })).toHaveAttribute('aria-label', `${stage.title} 1問目`)
      const questionPanel = page.locator('.geometry-match-frame, .geometry-count-diagram').first()
      await questionPanel.screenshot({ path: resolve(`docs/reviews/artifacts/geometry/${width}-${stage.mode}-question.png`) })
      if (stage.mode === 'match') {
        const q = stage.questions[0]!
        if (q.mode === 'match') {
          const index = q.candidates.findIndex(candidate => candidate.id === q.answerId)
          const option = page.getByRole('button', { name: `候補 ${index + 1}`, exact: false })
          const dimensions = await option.evaluate(element => { const box = element.getBoundingClientRect(); return { width: box.width, height: box.height } })
          expect(dimensions.width).toBeGreaterThanOrEqual(44)
          expect(dimensions.height).toBeGreaterThanOrEqual(44)
          await option.click()
        }
      } else {
        const textbox = page.getByRole('textbox', { name: '見つけた数' })
        await expect(textbox).toBeVisible()
        await expect(page.getByText(stage.questions[0]!.mode === 'count' ? stage.questions[0]!.explanation : '', { exact: true })).toHaveCount(0)
        const digitButtons = await page.locator('.geometry-count-input .number-pad button').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return [rect.width, rect.height] }))
        expect(digitButtons.every(([buttonWidth, buttonHeight]) => buttonWidth! >= 44 && buttonHeight! >= 44)).toBe(true)
        await textbox.fill(String(stage.questions[0]!.mode === 'count' ? stage.questions[0]!.solutions.length : 0))
      }
      await page.getByRole('button', { name: 'こたえあわせ' }).click()
      await expect(page.locator('.geometry-explanation')).toBeVisible()
      const contourButtons = await page.locator('.geometry-contour-controls button').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return [rect.width, rect.height] }))
      expect(contourButtons.every(([buttonWidth, buttonHeight]) => buttonWidth! >= 44 && buttonHeight! >= 44)).toBe(true)
      await page.locator('.geometry-explanation').screenshot({ path: resolve(`docs/reviews/artifacts/geometry/${width}-${stage.mode}-explanation.png`) })
      await page.getByRole('button', { name: 'やめてえらびなおす' }).click()
    }
    await page.getByRole('button', { name: 'はっけんカードちょう' }).click()
    await page.locator('.geometry-book-grid').screenshot({ path: resolve(`docs/reviews/artifacts/geometry/${width}-book.png`) })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const bookControls = await page.locator('.geometry-panel button').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return [rect.width, rect.height] }))
    expect(bookControls.every(([buttonWidth, buttonHeight]) => buttonWidth! >= 44 && buttonHeight! >= 44)).toBe(true)
    await page.getByRole('button', { name: 'ステージをえらぶ' }).click()
    const first = GEOMETRY_STAGES[0]!
    await page.getByRole('button', { name: new RegExp(first.title) }).click()
    await page.getByRole('button', { name: 'はじめる' }).click()
    const q = first.questions[0]!
    if (q.mode === 'match') await page.getByRole('button', { name: `候補 ${q.candidates.findIndex(c => c.id === q.answerId) + 1}`, exact: false }).click()
    await page.getByRole('button', { name: 'こたえあわせ' }).click()
    await page.getByRole('button', { name: /やめてえらびなおす/ }).click()
    await page.getByRole('button', { name: new RegExp(first.title) }).click()
    await page.getByRole('button', { name: 'はじめる' }).click()
    // Result page gets a genuine completion using the shared visible UI.
    for (const question of first.questions) {
      if (question.mode === 'match') await page.getByRole('button', { name: `候補 ${question.candidates.findIndex(c => c.id === question.answerId) + 1}`, exact: false }).click()
      await page.getByRole('button', { name: 'こたえあわせ' }).click()
      await page.getByRole('button', { name: /つぎへ|けっかをみる/ }).click()
    }
    await expect(page.getByRole('heading', { name: 'よくがんばったね！' })).toBeVisible()
    await page.locator('.geometry-result').screenshot({ path: resolve(`docs/reviews/artifacts/geometry/${width}-result.png`) })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const resultControls = await page.locator('.geometry-result button').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return [rect.width, rect.height] }))
    expect(resultControls.every(([buttonWidth, buttonHeight]) => buttonWidth! >= 44 && buttonHeight! >= 44)).toBe(true)
    await page.getByRole('button', { name: 'ステージをえらぶ' }).click()
  }
})

test('selected circle contour has a visible highlight in the real diagram', async ({ page }) => {
  const stage = GEOMETRY_STAGES[6]!
  await go(page, '/geometry')
  await page.getByRole('button', { name: new RegExp(stage.title) }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  for (let index = 0; index < 4; index++) {
    const question = stage.questions[index]!
    if (question.mode === 'count') await page.getByRole('textbox', { name: '見つけた数' }).fill(String(question.solutions.length))
    await page.getByRole('button', { name: 'こたえあわせ' }).click()
    await page.getByRole('button', { name: 'つぎへ' }).click()
  }
  const question = stage.questions[4]!
  if (question.mode !== 'count' || question.targetKind !== 'circle') throw new Error('expected circle count item')
  await page.getByRole('textbox', { name: '見つけた数' }).fill(String(question.solutions.length))
  await page.getByRole('button', { name: 'こたえあわせ' }).click()
  const styles = await page.locator('.geometry-explanation .geometry-count-diagram > circle').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node)
    return { fill: style.fill, stroke: style.stroke, width: style.strokeWidth, classes: node.getAttribute('class') }
  }))
  const selected = styles.find(item => item.classes?.includes('geometry-count-selected'))
  expect(selected).toBeTruthy()
    expect(selected!.fill !== 'none' || selected!.width !== styles[0]!.width || selected!.stroke !== styles[0]!.stroke).toBe(true)
})
