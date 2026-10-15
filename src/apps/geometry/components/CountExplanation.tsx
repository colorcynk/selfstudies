import { useEffect, useState } from 'react'
import type { CountQuestion } from '../domain/types'
import { CountDiagram } from './CountDiagram'

export function CountExplanation({ question }: { question: CountQuestion }) {
  const [selected, setSelected] = useState(0)
  const total = question.solutions.length
  useEffect(() => setSelected(0), [question.id])
  return <section className="geometry-explanation" aria-labelledby="geometry-count-explanation-title">
    <h3 id="geometry-count-explanation-title">こたえを たしかめよう</h3>
    <CountDiagram question={question} showSolutions={total > 0} solutionIndex={total ? selected : undefined} />
    {total === 0
      ? <p>この図には、{question.breakdown.map((item) => item.label).join('・')}の輪郭はありません。あてはまる形は0こです。</p>
      : <>
        <p>{total}こ見つかりました。{question.breakdown.map((item) => `${item.label}${item.count}こ`).join('、')}。</p>
        <div className="geometry-contour-controls" aria-label="数えた輪郭を選ぶ">
          <button type="button" onClick={() => setSelected((index) => Math.max(0, index - 1))} disabled={selected === 0} aria-label="前の輪郭">まえ</button>
          <span aria-live="polite">{selected + 1} / {total}</span>
          <button type="button" onClick={() => setSelected((index) => Math.min(total - 1, index + 1))} disabled={selected === total - 1} aria-label="次の輪郭">つぎ</button>
        </div>
      </>}
    <p>{question.explanation}</p>
  </section>
}
