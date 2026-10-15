import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GEOMETRY_STAGES } from '../../src/apps/geometry/data'
import { go } from './helpers'

const artifactDir = resolve('docs/reviews/artifacts/geometry')
const safe = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-')

test('all 45 Geometry questions render, explain, and complete with durable visual evidence', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 375, height: 900 })
  await mkdir(artifactDir, { recursive: true })
  test.setTimeout(300_000)
  const manifest: { id: string; mode: string; question: string; explanation: string; contours?: string[]; answer: string | number }[] = []
  for (const [stageIndex, stage] of GEOMETRY_STAGES.entries()) {
    await go(page, '/geometry')
    await page.getByRole('button', { name: new RegExp(stage.title) }).click()
    await page.getByRole('button', { name: 'はじめる' }).click()
    for (const [questionIndex, question] of stage.questions.entries()) {
      const slug = safe(question.id)
      const frame = question.mode === 'match' ? page.locator('.geometry-match-frame') : page.locator('.geometry-count-diagram').first()
      await expect(frame).toBeVisible()
      await frame.screenshot({ path: resolve(artifactDir, `${slug}-question.png`) })
      if (question.mode === 'match') {
        const answerIndex = question.candidates.findIndex(candidate => candidate.id === question.answerId)
        expect(answerIndex).toBeGreaterThanOrEqual(0)
        await page.getByRole('button', { name: `候補 ${answerIndex + 1}`, exact: false }).click()
        await page.getByRole('button', { name: 'こたえあわせ' }).click()
        const explanation = page.locator('.geometry-explanation')
        await expect(explanation).toBeVisible()
        await explanation.screenshot({ path: resolve(artifactDir, `${slug}-explanation.png`) })
        manifest.push({ id: question.id, mode: question.mode, question: `${slug}-question.png`, explanation: `${slug}-explanation.png`, answer: question.answerId })
      } else {
        await page.getByRole('textbox', { name: '見つけた数' }).fill(String(question.solutions.length))
        await page.getByRole('button', { name: 'こたえあわせ' }).click()
        const explanation = page.locator('.geometry-explanation')
        await expect(explanation).toBeVisible()
        if (question.solutions.length === 0) {
          await expect(explanation.getByRole('button', { name: '前の輪郭' })).toHaveCount(0)
          await expect(explanation.getByRole('button', { name: '次の輪郭' })).toHaveCount(0)
        } else {
          const counter = explanation.getByText(`1 / ${question.solutions.length}`, { exact: true })
          await expect(counter).toBeVisible()
          await expect(explanation.getByRole('button', { name: '前の輪郭' })).toBeDisabled()
          const contours: string[] = []
          await explanation.screenshot({ path: resolve(artifactDir, `${slug}-contour-1.png`) })
          contours.push(`${slug}-contour-1.png`)
          for (let n = 1; n < question.solutions.length; n++) {
            await explanation.getByRole('button', { name: '次の輪郭' }).click()
            const contour = `${slug}-contour-${n + 1}.png`
            await explanation.screenshot({ path: resolve(artifactDir, contour) })
            contours.push(contour)
          }
          await expect(explanation.getByText(`${question.solutions.length} / ${question.solutions.length}`, { exact: true })).toBeVisible()
          await expect(explanation.getByRole('button', { name: '次の輪郭' })).toBeDisabled()
          for (let n = 1; n < question.solutions.length; n++) await explanation.getByRole('button', { name: '前の輪郭' }).click()
          await expect(counter).toBeVisible()
        }
        await explanation.screenshot({ path: resolve(artifactDir, `${slug}-explanation.png`) })
        manifest.push({ id: question.id, mode: question.mode, question: `${slug}-question.png`, explanation: `${slug}-explanation.png`, ...(question.solutions.length ? { contours: Array.from({ length: question.solutions.length }, (_, i) => `${slug}-contour-${i + 1}.png`) } : {}), answer: question.solutions.length })
      }
      await expect(page.locator('#geometry-question-title')).toHaveText('こたえを たしかめよう')
      const next = page.getByRole('button', { name: questionIndex === 4 ? 'けっかをみる' : 'つぎへ' })
      await next.click()
      if (questionIndex < 4) await expect(page.locator('.geometry-play-head')).toContainText(`${questionIndex + 2} / 5`)
    }
    await expect(page.getByRole('heading', { name: 'よくがんばったね！' })).toBeVisible()
    await expect(page.getByText('5 / 5')).toBeVisible()
    if (stageIndex < 8) {
      await expect(page.getByRole('button', { name: 'カードちょう' })).toBeVisible()
      await page.getByRole('button', { name: 'ステージをえらぶ' }).click()
    }
  }
  expect(manifest).toHaveLength(45)
  await writeFile(resolve(artifactDir, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), questions: manifest }, null, 2))
  const sections = GEOMETRY_STAGES.map(stage => {
    const rows = manifest.filter(item => item.id.startsWith(`${stage.id}:`)).map(item => `<tr><th>${item.id}</th><td><img src="${item.question}" alt="${item.id} 問題"></td><td><img src="${item.explanation}" alt="${item.id} 解説"></td><td>${(item.contours ?? []).map(file => `<img src="${file}" alt="${file}">`).join('')}</td></tr>`).join('\n')
    return `<section><h2>${stage.title}</h2><table><thead><tr><th>ID</th><th>問題</th><th>解説</th><th>輪郭</th></tr></thead><tbody>${rows}</tbody></table></section>`
  }).join('\n')
  await writeFile(resolve(artifactDir, 'contact-sheet.html'), `<!doctype html><meta charset="utf-8"><title>図形探検 全45問レビュー</title><style>body{font:16px sans-serif;margin:1rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:.4rem;vertical-align:top}img{max-width:375px;max-height:420px;object-fit:contain}section{break-after:page}</style><h1>図形探検 全45問レビュー</h1>${sections}`)
})

test('all basic matching figures keep equal physical scale and fit at three widths', async ({ page }) => {
  test.setTimeout(300_000)
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.reload()
    for (const stage of GEOMETRY_STAGES.filter(item => item.mode === 'match')) {
      await go(page, '/geometry')
      await page.getByRole('button', { name: new RegExp(stage.title) }).click()
      await page.getByRole('button', { name: 'はじめる' }).click()
      for (const question of stage.questions) {
        const metrics = await page.locator('.geometry-match-frame svg').evaluateAll(nodes => nodes.map(node => {
          const box = node.getBoundingClientRect()
          const svg = node as SVGSVGElement
          const bounds = svg.getBBox()
          const viewBox = svg.viewBox.baseVal
          return { width: box.width, height: box.height, viewBox: node.getAttribute('viewBox'), ratio: box.width / box.height, drawnInside: bounds.x >= viewBox.x && bounds.y >= viewBox.y && bounds.x + bounds.width <= viewBox.x + viewBox.width && bounds.y + bounds.height <= viewBox.y + viewBox.height }
        }))
        expect(metrics.length).toBe(5)
        expect(Math.max(...metrics.map(item => item.width)) - Math.min(...metrics.map(item => item.width))).toBeLessThanOrEqual(1)
        expect(Math.max(...metrics.map(item => item.height)) - Math.min(...metrics.map(item => item.height))).toBeLessThanOrEqual(1)
        expect(new Set(metrics.map(item => item.viewBox)).size).toBe(1)
        expect(Math.max(...metrics.map(item => item.ratio)) - Math.min(...metrics.map(item => item.ratio))).toBeLessThan(.01)
        for (const item of metrics) expect(Math.abs(item.width - item.height)).toBeLessThanOrEqual(1)
        expect(metrics.every(item => item.drawnInside)).toBe(true)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        const controls = await page.locator('.geometry-match-options button, .geometry-actions button').evaluateAll(nodes => nodes.filter(node => {
          const rect = node.getBoundingClientRect()
          return rect.width < 44 || rect.height < 44
        }).map(node => node.outerHTML))
        expect(controls).toEqual([])
        const q = question
        const answerIndex = q.mode === 'match' ? q.candidates.findIndex(c => c.id === q.answerId) : 0
        await page.getByRole('button', { name: `候補 ${answerIndex + 1}`, exact: false }).click()
        await page.getByRole('button', { name: 'こたえあわせ' }).click()
        await page.getByRole('button', { name: /つぎへ|けっかをみる/ }).click()
      }
      await expect(page.getByRole('heading', { name: 'よくがんばったね！' })).toBeVisible()
      await page.getByRole('button', { name: 'ステージをえらぶ' }).click()
    }
  }
})
