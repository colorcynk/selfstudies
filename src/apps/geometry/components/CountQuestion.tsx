import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { NumberInput } from '../../../components'
import { parseIntegerInput } from '../../../shared/interaction/guard'
import type { CountQuestion } from '../domain/types'
import { CountDiagram } from './CountDiagram'
import { CountExplanation } from './CountExplanation'

const kindNames = {
  circle: '円（まる）', square: '正方形', rectangle: '長方形',
  equilateral: '正三角形', isosceles: '二等辺三角形', 'right-triangle': '直角三角形',
}

type Props = {
  question: CountQuestion
  locked: boolean
  value: string
  feedback: ReactNode
  headingRef?: RefObject<HTMLHeadingElement | null>
  onChange: (value: string) => void
  onSubmit: () => void
}

export function CountQuestionView({ question, locked, value, feedback, headingRef, onChange, onSubmit }: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.stopPropagation()
    if (!event.repeat) onSubmit()
  }

  return <>
    <h2 id="geometry-question-title" ref={headingRef} tabIndex={-1}>{locked ? 'こたえを たしかめよう' : `${kindNames[question.targetKind]}を いくつ見つけられるかな？`}</h2>
    {!locked && <>
      <CountDiagram question={question} />
      <NumberInput label="見つけた数" value={value} onChange={onChange} disabled={locked} maxLength={3} className="geometry-count-input" onKeyDown={onKeyDown} />
      {feedback}
      <div className="geometry-actions"><button type="button" className="primary-button" onClick={onSubmit}>こたえあわせ</button></div>
    </>}
    {locked && <CountExplanation question={question} />}
  </>
}

export { parseIntegerInput }
