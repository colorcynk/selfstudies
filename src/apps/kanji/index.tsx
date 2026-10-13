import { useRef, useState } from 'react'
import { GameLayout, Feedback } from '../../components'
import { NORMAL_STAGES, type NormalQuestion } from './data/normal'
import { getReadingDifferenceStage, gradeNormalQuestion, gradeReadingDifferenceSentence, type AnswerMap } from './domain/engine'
import { READING_DIFFERENCE_STAGE_ID } from './data/readingDifference'
import { useProgress } from '../../shared/progress'
import { createSubmissionGuard } from '../../shared/interaction/guard'
import './styles.css'

type Screen = 'select' | 'play-normal' | 'play-difference' | 'result' | 'book'
type Mode = 'standard' | 'reading-difference'
const difference = getReadingDifferenceStage()
const makeId = () => `kanji-${Date.now()}-${Math.random().toString(36).slice(2)}`
function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default function Kanji() {
  const { progress, completeSession } = useProgress()
  const [screen, setScreen] = useState<Screen>('select')
  const [mode, setMode] = useState<Mode>('standard')
  const [grade, setGrade] = useState<2 | 3>(2)
  const [stageIndex, setStageIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [firstCorrect, setFirstCorrect] = useState(0)
  const score = useRef(0)
  const [selected, setSelected] = useState('')
  const [choiceOrder, setChoiceOrder] = useState<Record<string, string[]>>({})
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [locked, setLocked] = useState<readonly string[]>([])
  const [hasCheckedDifference, setHasCheckedDifference] = useState(false)
  const [differenceComplete, setDifferenceComplete] = useState(false)
  const [normalFeedback, setNormalFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [differenceFeedback, setDifferenceFeedback] = useState<Record<string, boolean> | null>(null)
  const [sessionId, setSessionId] = useState('')
  const guard = useRef(createSubmissionGuard())
  const token = useRef(0)
  const advanceGuard = useRef(createSubmissionGuard())
  const advanceToken = useRef(0)
  const renderedToken = token.current
  const renderedAdvanceToken = advanceToken.current
  const stages = NORMAL_STAGES.filter((stage) => stage.grade === grade)
  const stage = stages[stageIndex]
  const question = stage?.questions[questionIndex] as NormalQuestion | undefined
  const sentence = difference[questionIndex]

  function beginNormal(selectedStage = 0) {
    const nextSession = makeId()
    guard.current = createSubmissionGuard(); advanceGuard.current = createSubmissionGuard()
    setSessionId(nextSession); setMode('standard'); setStageIndex(selectedStage); setQuestionIndex(0); setFirstCorrect(0); score.current = 0
    setChoiceOrder(Object.fromEntries(stages[selectedStage].questions.map((item) => [item.id, shuffle(item.choices)])))
    setSelected(''); setNormalFeedback(null); token.current = guard.current.setQuestion(`${nextSession}:${stages[selectedStage].questions[0].id}`)
    setScreen('play-normal')
  }
  function beginDifference() {
    const nextSession = makeId()
    guard.current = createSubmissionGuard(); advanceGuard.current = createSubmissionGuard()
    setSessionId(nextSession); setMode('reading-difference'); setQuestionIndex(0); setFirstCorrect(0); score.current = 0
    setChoiceOrder(Object.fromEntries(difference.flatMap((item) => item.targets.map((target) => [target.id, shuffle(target.choices)] as const))))
    setAnswers({}); setLocked([]); setDifferenceFeedback(null); setHasCheckedDifference(false); setDifferenceComplete(false); token.current = guard.current.setQuestion(`${nextSession}:${difference[0].id}`)
    setScreen('play-difference')
  }
  function finish() {
    const stageId = mode === 'standard' ? stage.id : READING_DIFFERENCE_STAGE_ID
    completeSession({ sessionId, appId: 'kanji', modeId: mode, stageId, questionCount: 5, firstCorrectCount: score.current, completedAt: new Date().toISOString() })
    setScreen('result')
  }
  function nextNormal() {
    const next = questionIndex + 1
    if (next === 5) { finish(); return }
    setQuestionIndex(next); setSelected(''); setNormalFeedback(null)
    token.current = guard.current.setQuestion(`${sessionId}:${stage.questions[next].id}`)
  }
  function checkNormal() {
    if (!question || !selected) return
    const qid = `${sessionId}:${question.id}`, captured = renderedToken, answer = selected, currentQuestion = question
    guard.current.submit(qid, captured, () => {
      const correct = gradeNormalQuestion(currentQuestion, answer)
      setNormalFeedback(correct ? 'correct' : 'wrong')
      if (correct) {
        score.current += normalFeedback === null ? 1 : 0; setFirstCorrect(score.current)
        advanceToken.current = advanceGuard.current.setQuestion(`${sessionId}:normal-next:${question.id}`)
      }
      else token.current = guard.current.rearm(qid, captured) ?? captured
    })
  }
  function checkDifference() {
    if (!sentence || sentence.targets.some((target) => !locked.includes(target.id) && !answers[target.id])) return
    const qid = `${sessionId}:${sentence.id}`, captured = renderedToken, submittedAnswers = answers, currentSentence = sentence
    guard.current.submit(qid, captured, () => {
      const result = gradeReadingDifferenceSentence(currentSentence, submittedAnswers, locked, !hasCheckedDifference)
      setHasCheckedDifference(true)
      setDifferenceFeedback(result.correctness)
      if (result.firstAttemptCorrect) { score.current += 1; setFirstCorrect(score.current) }
      if (result.complete) {
        setLocked(result.lockedTargetIds); setDifferenceComplete(true)
        advanceToken.current = advanceGuard.current.setQuestion(`${sessionId}:difference-next:${sentence.id}`)
      } else {
        setLocked(result.lockedTargetIds)
        token.current = guard.current.rearm(qid, captured) ?? captured
      }
    })
  }
  function advanceNormal() {
    const qid = question?.id
    if (!qid) return
    advanceGuard.current.submit(`${sessionId}:normal-next:${qid}`, renderedAdvanceToken, nextNormal)
  }
  function advanceDifference() {
    const qid = sentence?.id
    if (!qid) return
    advanceGuard.current.submit(`${sessionId}:difference-next:${qid}`, renderedAdvanceToken, () => {
      const next = questionIndex + 1
      if (next === 5) finish()
      else {
        setQuestionIndex(next); setAnswers({}); setLocked([]); setDifferenceFeedback(null); setHasCheckedDifference(false); setDifferenceComplete(false)
        token.current = guard.current.setQuestion(`${sessionId}:${difference[next].id}`)
      }
    })
  }

  return <GameLayout title="かん字たんけん隊" description="ことばの森をたんけんしよう！">
    {screen === 'select' && <div className="kanji-select">
      <div className="kanji-topline"><p>学年とたんけんをえらんでね</p><button className="kanji-secondary" onClick={() => setScreen('book')}>🏆 宝もの図かん</button></div>
      <div className="kanji-card"><h2>どの学年にする？</h2><div className="kanji-toggle" role="group" aria-label="学年">
        {([2, 3] as const).map((g) => <button key={g} className={grade === g ? 'is-selected' : ''} aria-pressed={grade === g} onClick={() => setGrade(g)}>小学{g}年生</button>)}
      </div><h2>どのたんけんに行く？</h2>
        <button className="kanji-mode" onClick={() => { setMode('standard'); setScreen('select') }} aria-pressed={mode === 'standard'}><span>📖</span><b>ふつうの かん字たんけん</b><small>読み方・つかい方を5問</small></button>
        <button className="kanji-mode" onClick={() => { setMode('reading-difference'); beginDifference() }}><span>🔎</span><b>よみわけ探検</b><small>同じ字のちがう読みを5文で見つけよう</small></button>
        {mode === 'standard' && <><h2>ステージをえらぼう</h2><div className="kanji-stages">{stages.map((item, i) => <button key={item.id} onClick={() => beginNormal(i)}><b>{i + 1}</b><span>ステージ {i + 1}</span><small>5問</small></button>)}</div></>}
      </div>
    </div>}
    {screen === 'play-normal' && question && <section className="kanji-card kanji-question" aria-labelledby="normal-prompt">
      <div className="kanji-progress"><span>小学{grade}年生　ステージ{stageIndex + 1}</span><b>もんだい {questionIndex + 1} / 5</b></div><div className="kanji-meter"><i style={{ width: `${(questionIndex / 5) * 100}%` }} /></div>
      <p className="kanji-skill">{question.skill === 'reading' ? '📣 読み方' : '✏️ つかい方'}</p><h2 id="normal-prompt">{question.prompt}</h2>
      {normalFeedback === 'correct' && <Feedback kind="correct">せいかい！よくできたね 🌟</Feedback>}
      {normalFeedback === 'wrong' && <Feedback kind="retry">おしい！ヒントを見て、もう一度えらんでみよう</Feedback>}
      {normalFeedback === 'wrong' && <Feedback kind="hint">ヒント：{question.hint}</Feedback>}
      {normalFeedback === 'correct' && <button className="primary-button kanji-check" onClick={advanceNormal}>{questionIndex === 4 ? '結果を見る' : 'つぎの問題へ'}　→</button>}
      <div className="kanji-choices" role="group" aria-label="答えを4つからえらぶ">{(choiceOrder[question.id] ?? question.choices).map((choice) => <button key={choice} disabled={normalFeedback === 'correct'} aria-pressed={selected === choice} className={`${selected === choice ? 'is-selected' : ''} ${normalFeedback === 'wrong' && selected === choice ? 'is-wrong' : ''}`} onClick={() => setSelected(choice)}>{choice}</button>)}</div>
      {normalFeedback !== 'correct' && <button className="primary-button kanji-check" disabled={!selected} onClick={checkNormal}>{normalFeedback === 'wrong' ? 'もう一度こたえる' : 'こたえをチェック'}</button>}
    </section>}
    {screen === 'play-difference' && sentence && <section className="kanji-card kanji-question" aria-label={`よみわけ探検 ${questionIndex + 1}問目`}>
      <div className="kanji-progress"><span>🔎 よみわけ探検</span><b>文 {questionIndex + 1} / 5</b></div><div className="kanji-meter"><i style={{ width: `${(questionIndex / 5) * 100}%` }} /></div>
      <div className="kanji-sentence" aria-label="文の中の番号つきの漢字を読もう">{sentence.segments.map((segment, i) => segment.targetId ? <span className="kanji-target" key={`${sentence.id}-${i}`}><strong aria-hidden="true">{sentence.targets.findIndex((target) => target.id === segment.targetId) + 1}</strong><ruby>{segment.text}<rt>{answers[segment.targetId] ?? '？'}</rt></ruby></span> : <span key={`${sentence.id}-${i}`}>{segment.text}</span>)}</div>
      <p className="kanji-instruction">文の中の <b>1</b> と <b>2</b> を、それぞれえらぼう</p>
      <div className="kanji-target-groups">{sentence.targets.map((target, i) => <fieldset key={target.id} className="kanji-target-group" disabled={locked.includes(target.id)}><legend><span>{i + 1}</span>「{target.kanji}」の読み</legend><div className="kanji-choices">{(choiceOrder[target.id] ?? target.choices).map((choice) => <button key={choice} type="button" aria-pressed={answers[target.id] === choice} className={`${answers[target.id] === choice ? 'is-selected' : ''} ${differenceFeedback?.[target.id] === false && answers[target.id] === choice ? 'is-wrong' : ''}`} onClick={() => setAnswers((current) => ({ ...current, [target.id]: choice }))}>{choice}</button>)}</div>{differenceFeedback && (locked.includes(target.id) ? <Feedback kind="correct">{i + 1}つ目、せいかい！この答えでロック ✨</Feedback> : <><Feedback kind="retry">{i + 1}つ目はもう一度えらんでね</Feedback><Feedback kind="hint">ヒント：{target.hint}</Feedback></>)}</fieldset>)}</div>
      {differenceComplete ? <button className="primary-button kanji-check" onClick={advanceDifference}>{questionIndex === 4 ? '結果を見る' : 'つぎの文へ'}　→</button> : <button className="primary-button kanji-check" disabled={sentence.targets.some((target) => !locked.includes(target.id) && !answers[target.id])} onClick={checkDifference}>こたえをチェック</button>}
    </section>}
    {screen === 'result' && <section className="kanji-card kanji-result"><span className="kanji-trophy">🏆</span><h2>たんけんクリア！</h2><p>はじめてのチェックで {firstCorrect} / 5 問せいかい</p><div className="kanji-reward">✨ 宝ものを図かんに記ろくしたよ ✨</div><button className="primary-button" onClick={() => setScreen('select')}>べつのたんけんへ</button><button className="kanji-secondary" onClick={() => setScreen('book')}>宝もの図かんを見る</button></section>}
    {screen === 'book' && <section className="kanji-card"><div className="kanji-book-heading"><h2>宝もの図かん</h2><button className="kanji-secondary" onClick={() => setScreen('select')}>もどる</button></div><p>クリアしたステージのお宝がならぶよ。</p><div className="kanji-book-grid">{[2, 3].flatMap((g) => Array.from({ length: 4 }, (_, i) => ({ id: `treasure:g${g}-0${i + 1}`, label: `${g}年 ステージ${i + 1}` }))).concat([{ id: 'treasure:reading-difference-01', label: 'よみわけ探検' }]).map((item) => {
      const owned = progress.rewards.treasure.includes(item.id)
      return <div className={`kanji-book-item ${owned ? 'owned' : ''}`} key={item.id}><span aria-hidden="true">{owned ? '💎' : '🔒'}</span><b>{item.label}</b><small>{owned ? 'クリア！' : 'まだ見つけていないよ'}</small></div>
    })}</div><p className="kanji-book-count">見つけた宝もの：{progress.rewards.treasure.filter((id) => id.startsWith('treasure:g') || id === 'treasure:reading-difference-01').length} / 9</p></section>}
  </GameLayout>
}
