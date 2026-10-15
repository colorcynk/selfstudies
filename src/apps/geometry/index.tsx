import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Feedback, GameLayout } from '../../components'
import { createSubmissionGuard, parseIntegerInput } from '../../shared/interaction/guard'
import { useProgress } from '../../shared/progress'
import { GEOMETRY_CATALOG } from '../../shared/progress/geometryCatalog'
import { CountQuestionView } from './components/CountQuestion'
import { MatchExplanation } from './components/MatchExplanation'
import { ShapeFigure } from './components/ShapeFigure'
import { GEOMETRY_STAGES, getGeometryStage } from './data'
import type { GeometryStage } from './data'
import type { MatchQuestion } from './domain/types'
import { canRecordCompletion, initialSession, transitionSession } from './domain/session'
import type { GeometrySession, SessionEvent } from './domain/session'
import './styles.css'

const sessionId = () => globalThis.crypto?.randomUUID?.() ?? `geometry-${Date.now()}-${Math.random().toString(36).slice(2)}`
const rewardFor = (stageId: string) => GEOMETRY_CATALOG.find((entry) => entry.stageId === stageId)?.reward
function InstructionsExample({ mode }: { mode: GeometryStage['mode'] }) {
  const square = { kind: 'polygon' as const, vertices: [{ x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: 2 }, { x: -2, y: 2 }] }
  const rotated = { ...square, vertices: square.vertices.map(({ x, y }) => ({ x: (x - y) * Math.SQRT1_2, y: (x + y) * Math.SQRT1_2 })) }
  const smaller = { ...square, vertices: square.vertices.map(({ x, y }) => ({ x: x * .65, y: y * .65 })) }
  return mode === 'match' ? <div className="geometry-instruction-demo">
    <div><span>みほん</span><ShapeFigure shape={square} label="見本の正方形" /></div><span aria-hidden="true">＝</span>
    <div><span>むきを かえても おなじ おおきさなら せいかい</span><ShapeFigure shape={rotated} label="回転した同じ大きさの正方形" /></div>
  </div> : <div className="geometry-instruction-demo geometry-count-demo">
    <p>おおきさや むきが ちがっても、条件にあう形は ぜんぶ かぞえるよ。</p>
    <div><ShapeFigure shape={smaller} label="小さな正方形の例" /><span>＋</span><ShapeFigure shape={rotated} label="向きを変えた大きな正方形の例" /><span>＝ 2こ</span></div>
  </div>
}

export default function Geometry() {
  const { progress, completeSession } = useProgress()
  const [session, setSession] = useState<GeometrySession>(initialSession)
  const latest = useRef(session)
  const completed = useRef(false)
  const guards = useRef(new Map<string, ReturnType<typeof createSubmissionGuard>>())
  const attemptTokens = useRef(new Map<string, number>())
  const heading = useRef<HTMLHeadingElement>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [countAnswer, setCountAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [, refreshGuardToken] = useState(0)
  const state = session
  const stage = state.stageId ? getGeometryStage(state.stageId) : undefined
  const question = stage?.questions[state.questionIndex]

  const send = (event: SessionEvent) => {
    const previous = latest.current
    const next = transitionSession(previous, event)
    if (next === previous) return next
    latest.current = next
    setSession(next)
    return next
  }

  useEffect(() => { heading.current?.focus() }, [state.phase, state.questionIndex])
  useEffect(() => {
    if ((state.phase !== 'answer' && state.phase !== 'explanation') || !question) return
    if (state.phase === 'answer') { setChoice(null); setCountAnswer(''); setFeedback('') }
    const guard = createSubmissionGuard()
    const guardId = `${state.sessionId}:${question.id}${state.phase === 'explanation' ? ':advance' : ''}`
    guards.current.set(guardId, guard)
    attemptTokens.current.set(guardId, guard.setQuestion(guardId))
    refreshGuardToken((version) => version + 1)
  }, [question?.id, state.phase])

  const begin = () => {
    completed.current = false
    guards.current.clear()
    attemptTokens.current.clear()
    setChoice(null)
    send({ type: 'begin', sessionId: sessionId() })
  }

  const liveGuardId = state.sessionId && question
    ? `${state.sessionId}:${question.id}${state.phase === 'explanation' ? ':advance' : ''}`
    : undefined
  const liveGuardToken = liveGuardId ? attemptTokens.current.get(liveGuardId) : undefined

  const commit = (active: GeometrySession) => {
    if (completed.current || !canRecordCompletion(active) || !active.stageId || !active.sessionId) return
    const completedStage = getGeometryStage(active.stageId)
    if (!completedStage) return
    completed.current = true
    completeSession({
      sessionId: active.sessionId,
      appId: 'geometry',
      modeId: completedStage.mode === 'match' ? 'geometry-match' : 'geometry-count',
      stageId: completedStage.id,
      questionCount: 5,
      firstCorrectCount: active.firstCorrectCount,
      completedAt: new Date().toISOString(),
    })
  }

  const submit = () => {
    if (!question || state.phase !== 'answer') return
    let correct: boolean
    if (question.mode === 'match') {
      if (!choice) { setFeedback('図を1つえらんでね。'); return }
      correct = choice === question.answerId
    } else {
      const parsed = parseIntegerInput(countAnswer)
      if (parsed === null) { setFeedback('0以上の整数を入力してね。'); return }
      correct = parsed === question.solutions.length
    }
    const guardId = `${state.sessionId}:${question.id}`
    const guard = guards.current.get(guardId)
    const token = liveGuardToken
    if (!guard || token === undefined) return
    guard.submit(guardId, token, () => {
      const before = latest.current
      if (before.phase !== 'answer' || before.sessionId !== state.sessionId || before.questionIds[before.questionIndex] !== question.id) return
      const next = send({ type: 'submit', sessionId: state.sessionId!, questionId: question.id, valid: true, correct })
      if (correct) setFeedback(question.mode === 'count' ? 'せいかい！ 輪郭をたしかめよう。' : 'せいかい！ かさなり方をたしかめよう。')
      else {
        setFeedback(question.hint)
        const rearmed = guard.rearm(guardId, token)
        if (rearmed !== null) {
          attemptTokens.current.set(guardId, rearmed)
          refreshGuardToken((version) => version + 1)
        }
      }
      return next
    })
  }

  const advance = () => {
    if (!question) return
    const guardId = `${state.sessionId}:${question.id}:advance`
    const guard = guards.current.get(guardId)
    const token = liveGuardToken
    if (!guard || token === undefined) return
    const before = latest.current
    guard.submit(guardId, token, () => {
      if (before.phase !== 'explanation' || before.sessionId !== state.sessionId || before.questionIds[before.questionIndex] !== question.id) return
      const next = send({ type: 'advance', sessionId: state.sessionId!, questionId: question.id })
      if (next !== before && canRecordCompletion(next)) commit(next)
    })
  }

  const onScreenKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (!event.repeat && event.target instanceof HTMLButtonElement) event.target.click()
  }

  const owned = new Set(progress.rewards.treasure)
  const book = <section className="geometry-panel" aria-labelledby="geometry-book-title">
    <p className="geometry-kicker">あつめたカード</p><h2 id="geometry-book-title" ref={heading} tabIndex={-1}>はっけんカードちょう</h2>
      <p>見つけたカード：{GEOMETRY_CATALOG.filter((item) => item.reward && owned.has(item.reward.id)).length} / {GEOMETRY_CATALOG.length}まい</p>
    <div className="geometry-book-grid">{GEOMETRY_STAGES.map((item) => {
      const reward = rewardFor(item.id)
      const isOwned = Boolean(reward && owned.has(reward.id))
      return <article className={`geometry-book-card ${isOwned ? 'is-owned' : 'is-unknown'}`} key={item.id}>
        <span aria-hidden="true">{isOwned ? '★' : '？'}</span><h3>{item.title}</h3>
        <p>{isOwned ? item.cardDescription : 'まだ見つけていないカード'}</p>
        {isOwned && item.mode === 'match' && <p>{item.description}</p>}
        <small>{isOwned ? 'みつけた！' : '？？？'}</small>
      </article>
    })}</div>
    <button className="geometry-secondary" onClick={() => send({ type: 'close-book' })}>ステージをえらぶ</button>
  </section>

  let content: ReactNode
  if (state.phase === 'book') content = book
  else if (state.phase === 'select') content = <section className="geometry-panel" aria-labelledby="geometry-select-title">
    <p className="geometry-kicker">どのステージにする？</p><h2 id="geometry-select-title" ref={heading} tabIndex={-1}>ずけいたんけん</h2>
    <div className="geometry-stage-grid">{GEOMETRY_STAGES.map((item, index) => <button className="geometry-stage-card" key={item.id} onClick={() => send({ type: 'select-stage', stage: item })}>
      <span className="geometry-stage-number">{index + 1}</span><strong>{item.title}</strong><small>{item.mode === 'match' ? 'おなじ かたち' : 'いくつ ある？'}・5もん</small><span>{state.stageId === item.id ? 'せんたく中' : 'えらぶ'}</span>
    </button>)}</div>
    <button className="geometry-secondary" onClick={() => send({ type: 'open-book' })}>はっけんカードちょう</button>
  </section>
  else if (state.phase === 'instructions' && stage) content = <section className="geometry-panel" aria-labelledby="geometry-instructions-title">
    <p className="geometry-kicker">あそびかた</p><h2 id="geometry-instructions-title" ref={heading} tabIndex={-1}>{stage.title}</h2>
    <p>{stage.description}</p><InstructionsExample mode={stage.mode} />
    <p>{stage.mode === 'match' ? 'みほんと かたちも おおきさも おなじ図をえらぼう。むきは かえても いいよ。' : '図の線で閉じた形を、大きさや向きによらず数えよう。正方形は長方形にも、正三角形は二等辺三角形にも、直角二等辺三角形は直角三角形にも数えるよ。大きな輪郭も数えるよ。'}</p>
    <div className="geometry-actions"><button className="primary-button" onClick={begin}>はじめる</button><button className="geometry-secondary" onClick={() => send({ type: 'choose-stage' })}>ステージをえらびなおす</button></div>
  </section>
  else if ((state.phase === 'answer' || state.phase === 'explanation') && stage && question) {
    const locked = state.phase === 'explanation'
    content = <section className="geometry-panel geometry-play" aria-label={`${stage.title} ${state.questionIndex + 1}問目`}>
      <div className="geometry-play-head"><p className="geometry-kicker">{stage.title}・{state.questionIndex + 1} / 5もん</p><button className="geometry-secondary" onClick={() => send({ type: 'abandon' })}>やめてえらびなおす</button></div>
      {question.mode === 'match' ? <>
        {(() => { const matchQuestion = question as MatchQuestion; return <>
        <h2 id="geometry-question-title" ref={heading} tabIndex={-1}>{locked ? 'こたえを たしかめよう' : 'みほんと おなじ かたちは どれ？'}</h2>
        {locked && <Feedback kind="correct">せいかい！ かさなり方をたしかめよう。</Feedback>}
        <div className="geometry-match-frame"><div className="geometry-match-example"><span>みほん</span><ShapeFigure shape={matchQuestion.example} label="見本の図形" /></div>
          <div className="geometry-match-options" role="group" aria-label="候補の図形">{matchQuestion.candidates.map((candidate, index) => <button type="button" className={`geometry-option ${choice === candidate.id ? 'is-selected' : ''}`} key={candidate.id} disabled={locked} aria-pressed={choice === candidate.id} aria-label={`候補 ${index + 1}`} onClick={() => setChoice(candidate.id)}>
            <span>{choice === candidate.id ? `候補 ${index + 1}・せんたく中` : `候補 ${index + 1}`}</span><ShapeFigure shape={candidate.shape} label={`候補 ${index + 1} の図形`} />
          </button>)}</div>
        </div>
        {locked ? <MatchExplanation question={matchQuestion} shapeKind={stage.id.endsWith('circle') ? 'circle' : stage.id.endsWith('square') ? 'square' : stage.id.endsWith('rectangle') ? 'rectangle' : stage.id.endsWith('equilateral') ? 'equilateral' : stage.id.endsWith('isosceles') ? 'isosceles' : 'right-triangle'} stageDescription={stage.description} /> : feedback && <Feedback kind={feedback === matchQuestion.hint ? 'hint' : feedback.startsWith('せいかく') ? 'correct' : 'retry'}>{feedback}</Feedback>}
        {!locked && <div className="geometry-actions"><button className="primary-button" onClick={submit}>こたえあわせ</button></div>}
      </> })()}
      </> : <>
        <CountQuestionView question={question} locked={locked} value={countAnswer} onChange={setCountAnswer} onSubmit={submit}
          headingRef={heading}
          feedback={feedback && <Feedback kind={feedback === question.hint ? 'hint' : feedback.startsWith('せいかく') ? 'correct' : 'retry'}>{feedback}</Feedback>} />
      </>}
      {locked && <div className="geometry-actions"><button className="primary-button" onClick={advance}>{state.questionIndex === 4 ? 'けっかをみる' : 'つぎへ'}</button></div>}
    </section>
  }
  else if (state.phase === 'result' && stage) {
    const reward = rewardFor(stage.id)
    const isOwned = Boolean(reward && owned.has(reward.id))
    content = <section className="geometry-panel geometry-result" aria-labelledby="geometry-result-title">
      <p className="geometry-kicker">チャレンジ おしまい！</p><h2 id="geometry-result-title" ref={heading} tabIndex={-1}>よくがんばったね！</h2>
      <p className="geometry-score">はじめに正解したもんだい <strong>{state.firstCorrectCount}</strong> / 5</p>
      <p>クリアしたステージ：{stage.title}</p><article className="geometry-result-reward"><span aria-hidden="true">★</span><h3>{stage.title}のカード</h3><p>{isOwned ? stage.cardDescription : 'カードを見つけたよ！'}</p>{isOwned && stage.mode === 'match' && <p>{stage.description}</p>}</article>
      <div className="geometry-actions"><button className="primary-button" onClick={() => send({ type: 'retry' })}>もう一度れんしゅう</button><button className="geometry-secondary" onClick={() => send({ type: 'choose-stage' })}>ステージをえらぶ</button><button className="geometry-secondary" onClick={() => send({ type: 'open-book' })}>カードちょう</button></div>
    </section>
  } else content = <section className="geometry-panel"><h2 ref={heading} tabIndex={-1}>ステージをえらんでね</h2></section>

  return <GameLayout title="ずけいたんけん" description="形のひみつを見つけよう！">
    <div onKeyDown={onScreenKeyDown}>{content}</div>
  </GameLayout>
}
