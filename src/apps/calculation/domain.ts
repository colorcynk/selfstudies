export type Operation = 'addition' | 'subtraction' | 'multiplication'
export type GridSize = 10 | 25 | 100
export type Cell = { row: number; column: number; answer: number }
export type CalculationGrid = { operation: Operation; size: GridSize; rows: number[]; columns: number[]; cells: Cell[] }
export type CellAnswers = Record<string, string>

const dimensions: Record<GridSize, [number, number]> = { 10: [2, 5], 25: [5, 5], 100: [10, 10] }
const keyOf = (row: number, column: number) => `${row}:${column}`
const shuffled = (values: number[], random: () => number) => {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function createGrid(operation: Operation, size: GridSize, random: () => number = Math.random): CalculationGrid {
  const [rowCount, columnCount] = dimensions[size]
  const rows = shuffled(Array.from({ length: 10 }, (_, i) => operation === 'subtraction' ? i + 10 : i), random).slice(0, rowCount)
  const columns = shuffled(Array.from({ length: 10 }, (_, i) => i), random).slice(0, columnCount)
  const answer = (row: number, column: number) => operation === 'addition' ? row + column : operation === 'subtraction' ? row - column : row * column
  return { operation, size, rows, columns, cells: rows.flatMap((row) => columns.map((column) => ({ row, column, answer: answer(row, column) }))) }
}

export function gradeGrid(grid: CalculationGrid, answers: CellAnswers): { complete: boolean; invalidKeys: string[]; correctKeys: string[]; wrongKeys: string[] } {
  const invalidKeys: string[] = []
  const correctKeys: string[] = []
  const wrongKeys: string[] = []
  for (const cell of grid.cells) {
    const key = keyOf(cell.row, cell.column)
    const raw = answers[key] ?? ''
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) invalidKeys.push(key)
    else if (Number(raw) === cell.answer) correctKeys.push(key)
    else wrongKeys.push(key)
  }
  return { complete: invalidKeys.length === 0, invalidKeys, correctKeys, wrongKeys }
}

export function timerEligible(timed: boolean, elapsedMs: number | null, firstCorrectCount: number, size: GridSize): elapsedMs is number {
  return timed && elapsedMs !== null && Number.isSafeInteger(elapsedMs) && elapsedMs >= 0 && firstCorrectCount === size
}

export function cellKey(row: number, column: number) { return keyOf(row, column) }
export function dimensionsFor(size: GridSize) { return dimensions[size] }
