import { expect, test, type Page } from '@playwright/test'
import { go, finishMonster, finishShopping, completeKanji, completeDifference, finishCalc } from './helpers'

const sizes = [375, 768, 1280] as const

async function observeBrowserErrors(page: Page, errors: string[]) {
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
}

async function noUnexpectedHorizontalOverflow(page: Page, route: string, width: number) {
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, body: document.body.scrollWidth }))
  expect(dimensions.body, `${route} horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1)
}

async function visiblePrimaryButtonsMeetTarget(page: Page, route: string, width: number) {
  const undersized = await page.locator('button:visible').evaluateAll(buttons => buttons.flatMap(button => {
    const rect = button.getBoundingClientRect()
    const primary = button.matches('.primary-button,.monster-primary,.monster-secondary,.shop-primary,.shop-secondary,.kanji-secondary,.calc-operation,.calc-size,.shop-quest,.stage-card,.shop-quantity button') || button.closest('.number-pad') !== null
    return primary && (rect.width < 44 || rect.height < 44) ? [`${button.textContent?.trim()}: ${Math.round(rect.width)}×${Math.round(rect.height)}`] : []
  }))
  expect(undersized, `${route} target sizes at ${width}px`).toEqual([])
}

async function verifyTouchTap(page: Page, width: number) {
  await go(page)
  const control = page.getByRole('button', { name: /九九モンスター/ }).first()
  await control.tap()
  await expect(page).toHaveURL(/#\/monsters$/)
  await expect(page.getByRole('heading', { name: '九九モンスター' })).toBeVisible()
  await go(page)
  await expect(page.getByRole('heading', { name: /ゲームをえらぼう/ })).toBeVisible()
  expect(width).toBeLessThan(1280)
}

async function focusAndLabels(page: Page) {
  await go(page, '/monsters')
  const stage = page.getByRole('button', { name: /1 のだん/ }).first()
  await page.keyboard.press('Tab')
  let focused = await page.evaluate(() => document.activeElement?.tagName === 'BUTTON' && !!document.activeElement?.matches(':focus-visible'))
  if (!focused) { await stage.focus(); focused = await stage.evaluate(element => element.matches(':focus-visible')) }
  expect(focused, 'keyboard focus indicator is active').toBeTruthy()
  await stage.focus(); await page.keyboard.press('Enter')
  await expect(page.locator('.equation')).toBeVisible()
  const textbox = page.getByRole('textbox').first()
  expect((await textbox.getAttribute('aria-label')) || await textbox.getAttribute('id')).toBeTruthy()
}

async function assertReducedMotion(page: Page) {
  const motion = await page.evaluate(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    active: [...document.querySelectorAll('*')].filter(element => {
      const style = getComputedStyle(element)
      return style.animationDuration.split(',').some(value => parseFloat(value) > 0) || style.transitionDuration.split(',').some(value => parseFloat(value) > 0)
    }).slice(0, 10).map(element => ({ tag: element.tagName, className: (element as HTMLElement).className, animation: getComputedStyle(element).animationDuration, transition: getComputedStyle(element).transitionDuration })),
  }))
  expect(motion.matches).toBe(true)
  expect(motion.active, 'reduced motion should suppress active animations and transitions').toEqual([])
}

async function checkSelectionAndFeedback(page: Page, width: number) {
  await go(page, '/monsters')
  await expect(page.getByRole('heading', { name: '九九モンスター' })).toBeVisible()
  await page.getByRole('button', { name: /1 のだん/ }).first().click()
  const equation = await page.locator('.equation').innerText()
  const [, left, right] = equation.match(/(\d+)\s*×\s*(\d+)/) ?? []
  await page.getByRole('textbox').fill(String(Number(left) * Number(right) + 1))
  await page.getByRole('button', { name: /^こたえる$/ }).click()
  await expect(page.getByText(/もういちど|おしい/).first()).toBeVisible()
  await page.getByRole('button', { name: /ヒントをみる/ }).click()
  await expect(page.getByText(/かい たす/)).toBeVisible()
  await page.getByRole('button', { name: /やめる/ }).click()

  await go(page, '/shopping')
  await expect(page.getByRole('heading', { name: 'おかいものクエスト' })).toBeVisible()
  await page.locator('.shop-quest').first().click()
  const quantityButton = page.getByRole('button', { name: /を1.+ふやす/ }).first()
  if (width < 1280) await quantityButton.tap()
  else await quantityButton.click()
  await expect(page.locator('.shop-quantity output').first()).toHaveText('1')
  await visiblePrimaryButtonsMeetTarget(page, 'shopping basket', width)
  await noUnexpectedHorizontalOverflow(page, 'shopping basket', width)
  await page.getByRole('button', { name: /クエストをやめる/ }).click()

  await go(page, '/kanji')
  await expect(page.getByRole('heading', { name: 'かん字たんけん隊' })).toBeVisible()
  await page.getByRole('button', { name: /小学2年生/ }).click()
  await page.getByRole('button', { name: /ふつうの かん字たんけん/ }).click()
  await page.locator('.kanji-stages button').first().click()
  await expect(page.locator('.kanji-question')).toBeVisible()
  await noUnexpectedHorizontalOverflow(page, 'kanji question', width)
  await go(page)

  await go(page, '/calculation')
  await expect(page.getByRole('heading', { name: /計算のしゅるい/ })).toBeVisible()
  await visiblePrimaryButtonsMeetTarget(page, 'calculation selection', width)
  await noUnexpectedHorizontalOverflow(page, 'calculation selection', width)
}

async function runMeaningfulScreens(page: Page, width: number) {
  await go(page)
  await expect(page.getByRole('heading', { name: /ゲームをえらぼう/ })).toBeVisible()
  await checkSelectionAndFeedback(page, width)
  await go(page)
  await noUnexpectedHorizontalOverflow(page, '/', width)
  await visiblePrimaryButtonsMeetTarget(page, '/', width)
  await page.screenshot({ path: `tests/e2e/artifacts/accessibility-${width}-home.png`, fullPage: true })

  // Every game reaches its real completion flow and persisted collection screen.
  await finishMonster(page, 1)
  await expect(page.getByText(/が なかまになったよ/)).toBeVisible()
  await visiblePrimaryButtonsMeetTarget(page, 'monster result', width)
  await page.getByRole('button', { name: /ずかんをみる/ }).click()
  await expect(page.getByText(/なかまは 1 \/ 9/)).toBeVisible()
  await noUnexpectedHorizontalOverflow(page, 'monster collection', width)

  await finishShopping(page, 0)
  await expect(page.getByText(/おつかい クリア/)).toBeVisible()
  await visiblePrimaryButtonsMeetTarget(page, 'shopping result', width)
  await page.getByRole('button', { name: /スタンプを見る/ }).click()
  await expect(page.getByText(/1 \/ 15 こ/)).toBeVisible()
  await noUnexpectedHorizontalOverflow(page, 'shopping collection', width)

  await completeKanji(page, 2, 0)
  await expect(page.getByText(/たんけんクリア/)).toBeVisible()
  await visiblePrimaryButtonsMeetTarget(page, 'kanji result', width)
  await page.getByRole('button', { name: /宝もの図かんを見る/ }).click()
  await expect(page.getByText(/見つけた宝もの：1 \/ 9/)).toBeVisible()
  await noUnexpectedHorizontalOverflow(page, 'kanji collection', width)

  await completeDifference(page)
  await expect(page.getByText(/たんけんクリア/)).toBeVisible()
  await page.screenshot({ path: `tests/e2e/artifacts/accessibility-${width}-difference-result.png`, fullPage: true })

  await finishCalc(page, 'addition', 10)
  await expect(page.getByRole('heading', { name: /よくがんばったね/ })).toBeVisible()
  await visiblePrimaryButtonsMeetTarget(page, 'calculation result', width)
}

test('B9/B10 accessible controls and real game flows at touch and desktop widths', async ({ browser }) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  for (const width of sizes) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 1280, isMobile: width < 600, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await observeBrowserErrors(page, errors)
    await runMeaningfulScreens(page, width)
    if (width < 1280) await verifyTouchTap(page, width)
    if (width === 1280) await focusAndLabels(page)

    await go(page, '/calculation')
    await page.getByRole('button', { name: /100ます/ }).click()
    await page.getByRole('button', { name: /計算をはじめる/ }).click()
    const scroller = page.locator('.calc-grid-scroll')
    await expect(scroller).toBeVisible()
    if (width < 600) {
      expect(await scroller.evaluate(element => element.scrollWidth > element.clientWidth)).toBeTruthy()
      await scroller.evaluate(element => { element.scrollLeft = element.scrollWidth })
      expect(await scroller.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
    }
    const unnamedInputs = await page.locator('input:visible').evaluateAll(inputs => inputs.filter(input => !input.getAttribute('aria-label') && !input.closest('label') && !document.querySelector(`label[for="${input.id}"]`)).map(input => input.outerHTML))
    expect(unnamedInputs, `all visible inputs have labels at ${width}px`).toEqual([])
    const first = page.locator('#cell-0')
    await first.focus()
    await expect(first).toBeFocused()
    await expect(page.locator('.calc-col-head').first()).toBeVisible()
    await page.screenshot({ path: `tests/e2e/artifacts/accessibility-${width}-grid.png`, fullPage: true })
    await assertReducedMotion(page)
    await context.close()
  }
  expect(errors, 'browser errors').toEqual([])
})

test('B9 desktop overview screenshot has the full home and game selection', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await go(page)
  await expect(page.getByRole('heading', { name: /ゲームをえらぼう/ })).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/artifacts/accessibility-1280-overview.png', fullPage: true })
})
