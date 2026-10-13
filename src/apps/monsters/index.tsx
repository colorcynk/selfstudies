import { useRef, useState } from 'react'
import { Feedback, GameLayout, NumberInput } from '../../components'
import { useProgress } from '../../shared/progress'
import { createSubmissionGuard, parseIntegerInput } from '../../shared/interaction/guard'
import { getFirstTryScoreAfterAnswer, createStageQuestions, getStagePracticeHistory, MONSTERS, type Monster, type Question } from './domain'
import './monsters.css'

type Screen = 'select' | 'play' | 'result' | 'book'
type Run = { table: number; questions: Question[]; sessionId: string }
type PlayPhase = 'answer' | 'advance'

function MonsterArt({ monster, size = 110 }: { monster: Monster; size?: number }) {
  const extra = monster.ears === 'cat' ? <><path d="M28 48 24 18l25 18M72 36l25-18-4 30" /></> :
    monster.ears === 'horn' ? <path d="m39 34-8-20 22 13m8 7 8-20-22 13" /> :
    monster.ears === 'leaf' ? <><path d="M34 35Q14 12 21 8q22 1 25 23m18 4Q77 12 86 14q0 21-16 27" /></> :
    monster.ears === 'star' ? <><path d="m32 42-15-19 24 2 9-19 8 22m18 14 14-19-23 2-9-19-4 22" /></> :
    monster.ears === 'sun' ? <><path d="M50 8v13M20 22l10 10m40-10L60 32M10 51h15m50 0h15" /></> :
    monster.ears === 'cloud' ? <><circle cx="32" cy="35" r="17"/><circle cx="69" cy="34" r="17"/></> :
    monster.ears === 'wing' ? <><path d="M27 41Q4 17 14 12q22 9 30 29m28 0q23-24 13-29-22 9-30 29" /></> :
    monster.ears === 'feather' ? <><path d="M34 35Q20 7 31 8q16 14 18 29m18-2Q82 7 71 8 55 22 53 37" /></> :
    <><circle cx="30" cy="30" r="18"/><circle cx="70" cy="30" r="18"/></>
  return <svg className="monster-art" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <g stroke="#573f4a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill={monster.color}>{extra}</g>
    <path d="M18 51Q18 35 34 35h32q16 0 16 16v21q0 18-32 18T18 72Z" fill={monster.color} stroke="#573f4a" strokeWidth="4" />
    <ellipse cx="50" cy="72" rx="19" ry="12" fill={monster.accent} opacity=".9" />
    <ellipse cx="39" cy="55" rx="4" ry="6" fill="#352d38"/><ellipse cx="61" cy="55" rx="4" ry="6" fill="#352d38"/>
    <path d="M45 64q5 6 10 0" fill="none" stroke="#573f4a" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="29" cy="64" r="4" fill="#f38d91"/><circle cx="71" cy="64" r="4" fill="#f38d91"/>
    <path d="M45 42q5-5 10 0" fill="none" stroke={monster.accent} strokeWidth="4" strokeLinecap="round"/>
  </svg>
}

function newSessionId() { return globalThis.crypto?.randomUUID?.() ?? `monsters-${Date.now()}-${Math.random().toString(36).slice(2)}` }

export default function Monsters() {
  const { progress, storageStatus, completeSession } = useProgress()
  const [screen, setScreen] = useState<Screen>('select')
  const [run, setRun] = useState<Run | null>(null)
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [firstCorrect, setFirstCorrect] = useState(0)
  const [feedback, setFeedback] = useState<'wrong' | 'right' | null>(null)
  const [playPhase, setPlayPhase] = useState<PlayPhase>('answer')
  const [actionToken, setActionToken] = useState(0)
  const [hint, setHint] = useState(false)
  const guard = useRef(createSubmissionGuard())
  const guardRef = useRef(guard.current)
  const firstScore = useRef(0)
  const wrongThisQuestion = useRef(false)
  const completed = useRef(false)

  const begin = (table: number) => {
    const nextRun = { table, questions: createStageQuestions(table), sessionId: newSessionId() }
    setRun(nextRun); setIndex(0); setInput(''); setFirstCorrect(0); firstScore.current = 0; completed.current = false
    setFeedback(null); setHint(false)
    wrongThisQuestion.current = false
    guardRef.current = createSubmissionGuard()
    setPlayPhase('answer')
    setActionToken(guardRef.current.setQuestion(`answer:${nextRun.sessionId}:0`))
    setScreen('play')
  }

  const submit = (attemptToken: number) => {
    if (!run) return
    const question = run.questions[index]
    const questionId = `answer:${run.sessionId}:${index}`
    guardRef.current.submit(questionId, attemptToken, () => {
      if (parseIntegerInput(input) !== question.answer) {
        setFeedback('wrong')
        wrongThisQuestion.current = true
        const retryToken = guardRef.current.rearm(questionId, attemptToken)
        if (retryToken !== null) setActionToken(retryToken)
        return
      }
      setFeedback('right')
      const isFirstTry = !wrongThisQuestion.current
      const nextScore = getFirstTryScoreAfterAnswer(firstScore.current, wrongThisQuestion.current)
      if (isFirstTry) { firstScore.current = nextScore; setFirstCorrect(nextScore) }
      setInput(''); setHint(false)
      if (index === 8) {
        if (!completed.current) {
          completed.current = true
          completeSession({ sessionId: run.sessionId, appId: 'monsters', modeId: 'kuku', stageId: `monsters:dan-${run.table}`, questionCount: 9, firstCorrectCount: nextScore, completedAt: new Date().toISOString() })
        }
        setScreen('result')
      } else {
        setPlayPhase('advance')
        setActionToken(guardRef.current.setQuestion(`advance:${run.sessionId}:${index}`))
      }
    })
  }

  const advance = (advanceToken: number) => {
    if (!run || playPhase !== 'advance') return
    const advanceId = `advance:${run.sessionId}:${index}`
    guardRef.current.submit(advanceId, advanceToken, () => {
      const nextIndex = index + 1
      wrongThisQuestion.current = false
      setFeedback(null); setPlayPhase('answer'); setIndex(nextIndex)
      setActionToken(guardRef.current.setQuestion(`answer:${run.sessionId}:${nextIndex}`))
    })
  }

  const title = screen === 'book' ? 'モンスターずかん' : '九九モンスター'
  return <GameLayout title={title} description="九九をといて、モンスターとなかよくなろう！">
    {storageStatus !== 'ready' && <p className="monster-storage" role="status">この端末では記録を保存できないことがあります。それでもあそべるよ。</p>}
    {screen === 'select' && <div className="monster-panel">
      <div className="monster-panel-head"><div><h2>どの だんに いく？</h2><p>1つのだんに、九九が9もんあるよ。</p></div><button className="monster-secondary" onClick={() => setScreen('book')}>ずかんをみる</button></div>
      <div className="stage-grid">{MONSTERS.map((monster, i) => { const table = i + 1; const owned = progress.rewards.monster.includes(`monster:dan-${table}`); return <button className={`stage-card ${owned ? 'is-owned' : ''}`} key={table} onClick={() => begin(table)}><span className="stage-no">{table} のだん</span><MonsterArt monster={monster} size={78}/><strong>{monster.name}</strong><span>{owned ? 'なかま！ またれんしゅうできるよ' : 'ぼうけんする →'}</span></button> })}</div>
    </div>}
    {screen === 'play' && run && <div className="monster-panel play-panel">
      <div className="play-top"><span>{run.table} のだん</span><span>もんだい {index + 1} / 9</span><button className="text-button" onClick={() => setScreen('select')}>やめる</button></div>
      <div className="progress-dots" aria-label={`${index + 1}問目 / 9問`}>{run.questions.map((_, i) => <span key={i} className={i < index ? 'done' : i === index ? 'current' : ''} />)}</div>
      <h2 className="equation">{run.table} × {run.questions[index].multiplier} <span>= ?</span></h2>
      {feedback === 'wrong' ? <Feedback kind="retry">おしい！ ヒントをみて、もういちど こたえてみよう。</Feedback> : feedback === 'right' ? <Feedback kind="correct">せいかい！ {playPhase === 'advance' ? 'つぎへすすもう。' : 'ぼうけんクリア！'}</Feedback> : <p className="play-prompt">こたえを すうじで いれてね。</p>}
      {hint && playPhase === 'answer' && <Feedback kind="hint">{run.table} を {run.questions[index].multiplier} かい たすと…？　{Array.from({ length: run.questions[index].multiplier }, () => run.table).join(' + ')}</Feedback>}
      {playPhase === 'answer' ? <div className="answer-row"><NumberInput label="こたえ" value={input} onChange={setInput} maxLength={2} onKeyDown={e => { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); submit(actionToken) } }} /><div className="answer-actions"><button className="monster-primary" onClick={() => submit(actionToken)}>こたえる</button><button className="monster-secondary" onClick={() => setHint(v => !v)} aria-expanded={hint}>{hint ? 'ヒントをとじる' : 'ヒントをみる'}</button></div></div> : <button className="monster-primary next-question" onClick={() => advance(actionToken)} onKeyDown={e => { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); advance(actionToken) } }}>つぎのもんだいへ</button>}
    </div>}
    {screen === 'result' && run && <div className="monster-panel result-panel"><div className="result-art"><MonsterArt monster={MONSTERS[run.table - 1]} size={150}/></div><p className="eyebrow">ぼうけん クリア！</p><h2>{MONSTERS[run.table - 1].name} が なかまになったよ！</h2><p className="result-score">はじめに せいかいしたのは <strong>{firstCorrect} / 9</strong> もん</p><div className="result-actions"><button className="monster-primary" onClick={() => setScreen('book')}>ずかんをみる</button><button className="monster-secondary" onClick={() => setScreen('select')}>べつのだんへ</button><button className="monster-secondary" onClick={() => begin(run.table)}>もういちど れんしゅう</button></div></div>}
    {screen === 'book' && <div className="monster-panel"><div className="monster-panel-head"><div><h2>なかまは {progress.rewards.monster.length} / 9 ひき</h2><p>クリアしただんのモンスターが ここにあつまるよ。</p></div><button className="monster-secondary" onClick={() => setScreen(run && completed.current ? 'result' : 'select')}>もどる</button></div><div className="stage-grid book-grid">{MONSTERS.map((monster, i) => { const owned = progress.rewards.monster.includes(`monster:dan-${i + 1}`); const history = getStagePracticeHistory(progress.history, i + 1); const latest = history[0]; return <article className={`stage-card book-card ${owned ? 'is-owned' : 'is-locked'}`} key={monster.name}><span className="stage-no">{i + 1} のだん</span>{owned ? <MonsterArt monster={monster} size={86}/> : <span className="unknown-monster" aria-label="まだなかまになっていません">？</span>}<strong>{owned ? monster.name : '？？？'}</strong><span>{owned ? 'なかま！' : 'クリアすると あえるよ'}</span><span className="practice-result">{latest ? `さいきん ${latest.firstCorrectCount} / 9 もん` : 'れんしゅうけっか：まだ'}</span><span className="practice-count">保存されたきろく {history.length} 回</span></article> })}</div><button className="monster-primary book-start" onClick={() => setScreen('select')}>だんをえらぶ</button></div>}
  </GameLayout>
}
