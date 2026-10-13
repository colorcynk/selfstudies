import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Feedback, GameLayout } from '../../components'
import { parseIntegerInput, createSubmissionGuard } from '../../shared/interaction/guard'
import { useProgress } from '../../shared/progress'
import { cellKey, createGrid, gradeGrid, timerEligible } from './domain'
import type { CalculationGrid, CellAnswers, GridSize, Operation } from './domain'
import './styles.css'

type Run = { grid: CalculationGrid; timed: boolean; sessionId: string; startedAt: number; token: number }
const operations: { id: Operation; symbol: string; label: string; color: string }[] = [
  { id: 'addition', symbol: '＋', label: 'たし算', color: 'calc-peach' },
  { id: 'subtraction', symbol: '−', label: 'ひき算', color: 'calc-blue' },
  { id: 'multiplication', symbol: '×', label: 'かけ算', color: 'calc-lilac' },
]
const sizes: { id: GridSize; label: string; shape: string }[] = [
  { id: 10, label: '10問', shape: '2 × 5 ます' }, { id: 25, label: '25ます', shape: '5 × 5 ます' }, { id: 100, label: '100ます', shape: '10 × 10 ます' },
]
const newSessionId = () => globalThis.crypto?.randomUUID?.() ?? `calc-${Date.now()}-${Math.random().toString(36).slice(2)}`

export default function Calculation() {
  const { progress, completeSession } = useProgress()
  const guard = useRef(createSubmissionGuard())
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const completed = useRef(false)
  const firstGraded = useRef(false)
  const [operation, setOperation] = useState<Operation>('addition')
  const [size, setSize] = useState<GridSize>(10)
  const [timed, setTimed] = useState(false)
  const [run, setRun] = useState<Run | null>(null)
  const [answers, setAnswers] = useState<CellAnswers>({})
  const [firstCorrect, setFirstCorrect] = useState<string[]>([])
  const [wrong, setWrong] = useState<string[]>([])
  const [firstCorrectCount, setFirstCorrectCount] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<{ operation: Operation; size: GridSize; firstCorrectCount: number; elapsedMs: number | null; timed: boolean; best: boolean } | null>(null)

  const start = () => {
    setResult(null)
    const grid = createGrid(operation, size)
    const sessionId = newSessionId()
    const questionId = `${operation}-${size}-${sessionId}`
    const token = guard.current.setQuestion(questionId)
    completed.current = false
    firstGraded.current = false
    const startedAt = performance.now()
    setRun({ grid, timed, sessionId, startedAt, token })
    setAnswers(Object.fromEntries(grid.cells.map((cell) => [cellKey(cell.row, cell.column), ''])))
    setFirstCorrect([]); setWrong([]); setFirstCorrectCount(0); setMessage('')
  }

  const commitCompletion = (active: Run, count: number, elapsed: number) => {
    if (completed.current) return
    completed.current = true
    const bestEligible = timerEligible(active.timed, active.timed ? elapsed : null, count, active.grid.size)
    const previousBest = progress.bestTimes[`${active.grid.operation}-${active.grid.size}`]
    const best = bestEligible && (!previousBest || elapsed < previousBest.elapsedMs)
    completeSession({
      sessionId: active.sessionId, appId: 'calculation', modeId: active.grid.operation,
      stageId: `calculation:${active.grid.operation}-${active.grid.size}`, questionCount: active.grid.size,
      firstCorrectCount: count, completedAt: new Date().toISOString(), size: active.grid.size,
      ...(active.timed ? { timed: true, elapsedMs: elapsed } : { timed: false }),
    })
    setResult({ operation: active.grid.operation, size: active.grid.size, firstCorrectCount: count, elapsedMs: active.timed ? elapsed : null, timed: active.timed, best })
    setRun(null)
  }

  const grade = () => {
    if (!run || completed.current) return
    const parsed = Object.fromEntries(Object.entries(answers).map(([key, raw]) => [key, parseIntegerInput(raw)])) as Record<string, number | null>
    const invalid = run.grid.cells.filter((cell) => parsed[cellKey(cell.row, cell.column)] === null).map((cell) => cellKey(cell.row, cell.column))
    if (invalid.length) { setMessage(`まだ ${invalid.length} ますに答えが入っていないよ。`); inputs.current[run.grid.cells.findIndex((cell) => invalid.includes(cellKey(cell.row, cell.column)))]?.focus(); return }
    const questionId = `${run.grid.operation}-${run.grid.size}-${run.sessionId}`
    const activeToken = run.token
    guard.current.submit(questionId, activeToken, () => {
      const graded = gradeGrid(run.grid, answers)
      if (graded.invalidKeys.length) { setMessage('数字で答えてね。'); return }
      const score = firstGraded.current ? firstCorrectCount : graded.correctKeys.length
      if (!firstGraded.current) {
        firstGraded.current = true
        setFirstCorrect(graded.correctKeys)
        setFirstCorrectCount(graded.correctKeys.length)
      }
      setWrong(graded.wrongKeys)
      if (graded.wrongKeys.length === 0) {
        const elapsed = run.timed ? Math.max(0, Math.round(performance.now() - run.startedAt)) : 0
        commitCompletion(run, score, elapsed)
      } else {
        setMessage(`おしい！ ${graded.wrongKeys.length} ますをなおそう。正しい答えはそのままのこるよ。`)
        const retryToken = guard.current.rearm(questionId, activeToken)
        if (retryToken !== null) setRun({ ...run, token: retryToken })
      }
    })
  }

  const updateAnswer = (key: string, value: string) => {
    if (!run || (wrong.length > 0 && !wrong.includes(key))) return
    setAnswers((current) => ({ ...current, [key]: value.slice(0, 4) }))
    setMessage('')
  }

  const onCellKey = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter' || event.repeat) return
    event.preventDefault()
    const cells = run?.grid.cells ?? []
    for (let next = index + 1; next < cells.length; next++) {
      const key = cellKey(cells[next].row, cells[next].column)
      if (wrong.length === 0 || wrong.includes(key)) { inputs.current[next]?.focus(); break }
    }
  }

  const replay = () => { setResult(null); setRun(null); setMessage('') }
  const activeOperation = run ? operations.find((item) => item.id === run.grid.operation)! : operations.find((item) => item.id === operation)!

  return <GameLayout title="100ます計算" description="じぶんのペースで、楽しくチャレンジ！">
    {result ? <section className="calc-panel calc-result" aria-labelledby="calc-result-title">
      <div className="calc-result-badge" aria-hidden="true">★</div><p className="calc-kicker">チャレンジ おしまい！</p>
      <h2 id="calc-result-title">よくがんばったね！</h2>
      <p className="calc-score">はじめに正解したマス <strong>{result.firstCorrectCount}</strong> / {result.size}</p>
      {result.timed && <p className="calc-time">かかった時間 <strong>{formatTime(result.elapsedMs ?? 0)}</strong></p>}
      {result.best && <Feedback kind="correct">この記録がこのコースの自己ベストだよ！</Feedback>}
      <div className="calc-actions"><button className="primary-button" onClick={replay}>べつの計算をえらぶ</button><button className="calc-secondary" onClick={start}>もう一度チャレンジ</button></div>
    </section> : !run ? <section className="calc-panel calc-select" aria-labelledby="calc-select-title">
      <p className="calc-kicker">どれにする？</p><h2 id="calc-select-title">計算のしゅるい</h2>
      <div className="calc-operation-list" role="group" aria-label="計算のしゅるい">
        {operations.map((item) => <button key={item.id} type="button" className={`calc-operation ${item.color} ${operation === item.id ? 'selected' : ''}`} aria-pressed={operation === item.id} onClick={() => setOperation(item.id)}><span aria-hidden="true">{item.symbol}</span>{item.label}</button>)}
      </div>
      <h2>もんだいの数</h2><div className="calc-size-list" role="group" aria-label="もんだいの数">
        {sizes.map((item) => <button key={item.id} type="button" className={`calc-size ${size === item.id ? 'selected' : ''}`} aria-pressed={size === item.id} onClick={() => setSize(item.id)}><strong>{item.label}</strong><span>{item.shape}</span></button>)}
      </div>
      {operation === 'subtraction' && <Feedback kind="hint">ひき算は、たての数 − よこの数 で計算するよ。たての数が大きいから、答えはマイナスにならないよ。</Feedback>}
      {progress.bestTimes[`${operation}-${size}`] && <p className="calc-existing-best">このコースの自己ベスト：<strong>{formatTime(progress.bestTimes[`${operation}-${size}`].elapsedMs)}</strong></p>}
      <label className="calc-timer-choice"><input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} /><span><strong>時間をはかる</strong><small>時間のせいげんはないよ。ゆっくり取り組めるよ。</small></span></label>
      <button className="primary-button calc-start" onClick={start}>計算をはじめる <span aria-hidden="true">→</span></button>
    </section> : <section className="calc-panel calc-play" aria-label={`${activeOperation.label} ${run.grid.size}問`}>
      <div className="calc-play-head"><div><p className="calc-kicker">{activeOperation.symbol} {activeOperation.label}・{run.grid.size}問</p><h2>たてとよこの数で計算しよう</h2></div>{run.timed && <div className="calc-live-time" aria-label="計時中">⏱ 時間をはかっています</div>}</div>
      {run.grid.operation === 'subtraction' && <p className="calc-direction">たての数 − よこの数 ＝ 答え</p>}
      <p className="calc-help">ぜんぶのマスに答えを書いたら「答えあわせ」をおしてね。</p>
      <div className="calc-grid-scroll" role="region" aria-label="計算のマス。左右に動かせます" tabIndex={0}>
        <table className={`calc-grid ${run.grid.size === 100 ? 'calc-grid-100' : ''}`}>
          <thead><tr><th scope="col" className="calc-corner" aria-label="たての数とよこの数"></th>{run.grid.columns.map((column, index) => <th scope="col" key={`${column}-${index}`} className="calc-col-head">{column}</th>)}</tr></thead>
          <tbody>{run.grid.rows.map((row, rowIndex) => <tr key={row}><th scope="row" className="calc-row-head">{row}</th>{run.grid.columns.map((column, columnIndex) => {
            const key = cellKey(row, column); const cellIndex = run.grid.cells.findIndex((cell) => cell.row === row && cell.column === column)
            const correct = firstCorrect.includes(key)
            const active = wrong.length === 0 || wrong.includes(key)
            const symbol = run.grid.operation === 'addition' ? '+' : run.grid.operation === 'subtraction' ? '−' : '×'
            const label = `${rowIndex + 1}行目、たて${row}・${columnIndex + 1}列目、よこ${column}。${row} ${symbol} ${column} の答え`
            return <td key={`${row}-${column}`} className={`${correct ? 'is-correct' : ''} ${wrong.includes(key) ? 'is-wrong' : ''} ${active ? 'is-active' : ''}`}>
              {correct && <span className="calc-cell-status" aria-hidden="true">✓</span>}
              {wrong.includes(key) && <span className="calc-cell-status calc-cell-retry" aria-hidden="true">なおす</span>}
              <label className="visually-hidden" htmlFor={`cell-${cellIndex}`}>{label}</label>
              <input ref={(element) => { inputs.current[cellIndex] = element }} id={`cell-${cellIndex}`} type="text" inputMode="numeric" autoComplete="off" maxLength={4} value={answers[key] ?? ''} disabled={!active || correct} aria-label={correct ? `${label}、正解してロック中` : wrong.includes(key) ? `${label}、まちがい。なおしてね` : label} aria-invalid={wrong.includes(key) ? true : undefined} onChange={(event) => updateAnswer(key, event.target.value)} onKeyDown={(event) => onCellKey(event, cellIndex)} />
            </td>
          })}</tr>)}</tbody>
        </table>
      </div>
      {message && <Feedback kind={wrong.length ? 'retry' : 'hint'}>{message}</Feedback>}
      {wrong.length > 0 && <p className="calc-correction-note">正しくできたマスはロック中だよ。まちがえたマスをなおそう。</p>}
      <div className="calc-actions"><button type="button" className="primary-button calc-grade" onClick={grade}>{wrong.length ? 'なおした答えをチェック' : '答えあわせ'}</button><button type="button" className="calc-secondary" onClick={replay}>やめてえらびなおす</button></div>
    </section>}
  </GameLayout>
}

function formatTime(ms: number) { const seconds = Math.floor(ms / 1000); return `${Math.floor(seconds / 60)}分 ${String(seconds % 60).padStart(2, '0')}秒` }
