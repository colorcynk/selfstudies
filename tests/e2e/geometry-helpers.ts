import { expect, type Page } from '@playwright/test'
import { GEOMETRY_STAGES } from '../../src/apps/geometry/data'
import { go } from './helpers'

export async function finishGeometry(page: Page, stageIndex = 0) {
  const stage = GEOMETRY_STAGES[stageIndex]!
  await go(page, '/geometry')
  await page.getByRole('button', { name: new RegExp(stage.title) }).click()
  await page.getByRole('button', { name: 'はじめる' }).click()
  for (const question of stage.questions) {
    if (question.mode === 'match') {
      const answerIndex = question.candidates.findIndex(candidate => candidate.id === question.answerId)
      expect(answerIndex, `visible answer in ${question.id}`).toBeGreaterThanOrEqual(0)
      await page.getByRole('button', { name: `候補 ${answerIndex + 1}`, exact: false }).click()
    } else {
      await page.getByRole('textbox').fill(String(question.solutions.length))
    }
    await page.getByRole('button', { name: 'こたえあわせ' }).click()
    await expect(page.locator('#geometry-question-title')).toHaveText('こたえを たしかめよう')
    await page.getByRole('button', { name: /つぎへ|けっかをみる/ }).click()
  }
  await expect(page.getByRole('heading', { name: 'よくがんばったね！' })).toBeVisible()
}
