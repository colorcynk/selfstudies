import { describe, expect, it } from 'vitest'
import { createGrid, gradeGrid, timerEligible } from './domain'

const fixedRandom = () => 0.42

describe('calculation grid domain', () => {
  it.each([[10, 2, 5], [25, 5, 5], [100, 10, 10]] as const)('creates a %i-cell grid', (size, rows, columns) => {
    for (const operation of ['addition', 'subtraction', 'multiplication'] as const) {
      const grid = createGrid(operation, size, fixedRandom)
      expect(grid.rows).toHaveLength(rows)
      expect(grid.columns).toHaveLength(columns)
      expect(new Set(grid.rows).size).toBe(rows)
      expect(new Set(grid.columns).size).toBe(columns)
      expect(grid.cells).toHaveLength(size)
      for (const cell of grid.cells) {
        expect(cell.answer).toBe(operation === 'addition' ? cell.row + cell.column : operation === 'subtraction' ? cell.row - cell.column : cell.row * cell.column)
      }
      if (operation === 'subtraction') {
        expect(grid.rows.every((value) => value >= 10 && value <= 19)).toBe(true)
        expect(grid.columns.every((value) => value >= 0 && value <= 9)).toBe(true)
      } else expect([...grid.rows, ...grid.columns].every((value) => value >= 0 && value <= 9)).toBe(true)
    }
  })

  it('distinguishes blank, zero, and invalid responses, and grades only a complete grid', () => {
    const grid = createGrid('addition', 10, fixedRandom)
    const answers = Object.fromEntries(grid.cells.map((cell) => [`${cell.row}:${cell.column}`, String(cell.answer)]))
    answers[`${grid.cells[0].row}:${grid.cells[0].column}`] = ''
    expect(gradeGrid(grid, answers).complete).toBe(false)
    expect(gradeGrid(grid, answers).invalidKeys).toHaveLength(1)
    const zeroCell = grid.cells.find((cell) => cell.answer === 0)!
    answers[`${zeroCell.row}:${zeroCell.column}`] = '0'
    answers[`${grid.cells[0].row}:${grid.cells[0].column}`] = String(grid.cells[0].answer)
    expect(gradeGrid(grid, answers).complete).toBe(true)
    answers[`${grid.cells[0].row}:${grid.cells[0].column}`] = '-1'
    expect(gradeGrid(grid, answers).complete).toBe(false)
    answers[`${grid.cells[0].row}:${grid.cells[0].column}`] = '1.5'
    expect(gradeGrid(grid, answers).complete).toBe(false)
  })

  it('locks eligibility to timed all-first-correct completions', () => {
    expect(timerEligible(false, 500, 10, 10)).toBe(false)
    expect(timerEligible(true, null, 10, 10)).toBe(false)
    expect(timerEligible(true, 0, 9, 10)).toBe(false)
    expect(timerEligible(true, 1000, 10, 10)).toBe(true)
  })
})
