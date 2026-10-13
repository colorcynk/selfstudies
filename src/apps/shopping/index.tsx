import { useRef, useState } from 'react'
import { Feedback, GameLayout, NumberInput } from '../../components'
import { createSubmissionGuard, parseIntegerInput } from '../../shared/interaction/guard'
import { useProgress } from '../../shared/progress'
import { changeYen, multiplicationAnswer, totalYen, validateBasket } from './domain/engine'
import type { BasketLine, ShoppingQuest } from './domain/types'
import { PRODUCTS } from './data/products'
import { SHOPPING_QUESTS } from './data/quests'
import './styles.css'

type Screen = 'select' | 'play' | 'result' | 'stamps'
type Step = 'basket' | 'multiply' | 'total' | 'change'
type Run = { quest: ShoppingQuest; sessionId: string }
const unitFor = (quest: ShoppingQuest, step: Step) => step === 'total' || step === 'change' || (step === 'multiply' && quest.modeId === 'multiplication-money') ? '円' : 'こ'
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `shopping-${Date.now()}-${Math.random().toString(36).slice(2)}`

export default function Shopping() {
  const { progress, storageStatus, completeSession } = useProgress()
  const [screen, setScreen] = useState<Screen>('select')
  const [run, setRun] = useState<Run | null>(null)
  const [step, setStep] = useState<Step>('basket')
  const [basket, setBasket] = useState<BasketLine[]>([])
  const [input, setInput] = useState('')
  const [firstCorrect, setFirstCorrect] = useState(0)
  const [feedback, setFeedback] = useState<'wrong' | 'right' | null>(null)
  const [hint, setHint] = useState(false)
  const [basketError, setBasketError] = useState(false)
  const [actionToken, setActionToken] = useState(0)
  const guard = useRef(createSubmissionGuard())
  const firstScore = useRef(0)
  const wrongThisQuestion = useRef(false)
  const completed = useRef(false)

  const begin = (quest: ShoppingQuest) => {
    const nextRun = { quest, sessionId: makeId() }
    setRun(nextRun); setBasket([]); setInput(''); setFirstCorrect(0); firstScore.current = 0
    setStep('basket'); setFeedback(null); setHint(false); setBasketError(false)
    wrongThisQuestion.current = false; completed.current = false
    guard.current = createSubmissionGuard()
    setActionToken(guard.current.setQuestion(`basket:${nextRun.sessionId}`))
    setScreen('play')
  }

  const changeQuantity = (productId: string, quantity: number) => {
    if (run) {
      // Editing after a basket was confirmed invalidates its Continue callback immediately.
      setActionToken(guard.current.setQuestion(`basket:${run.sessionId}`))
      setFeedback(null)
      setBasketError(false)
    }
    setBasket(current => {
      if (quantity <= 0) return current.filter(line => line.productId !== productId)
      const found = current.some(line => line.productId === productId)
      return found ? current.map(line => line.productId === productId ? { ...line, quantity } : line) : [...current, { productId, quantity }]
    })
  }

  const nextStep = (current: Step, quest: ShoppingQuest): Step | 'finish' => {
    if (current === 'basket') return quest.multiplication ? 'multiply' : 'total'
    if (current === 'multiply') return 'total'
    if (current === 'total') return 'change'
    return 'finish'
  }

  const target = (quest: ShoppingQuest, current: Step) => current === 'multiply'
    ? multiplicationAnswer(quest, PRODUCTS)
    : current === 'total' ? totalYen(quest, PRODUCTS) : changeYen(quest.paidYen, totalYen(quest, PRODUCTS))

  const submitBasket = (token: number) => {
    if (!run) return
    const validation = validateBasket(basket, PRODUCTS, run.quest.basket)
    if (!validation.valid) { setBasketError(true); return }
    const questionId = `basket:${run.sessionId}`
    guard.current.submit(questionId, token, () => {
      setBasketError(false); setFeedback('right')
      setActionToken(guard.current.setQuestion(`basket-next:${run.sessionId}`))
      // Basket is a separate activity; correct feedback remains visible until the child continues.
      setStep('basket')
    })
  }

  const submitAnswer = (token: number) => {
    if (!run || (step !== 'multiply' && step !== 'total' && step !== 'change')) return
    const questionId = `${step}:${run.sessionId}`
    guard.current.submit(questionId, token, () => {
      if (parseIntegerInput(input) !== target(run.quest, step)) {
        setFeedback('wrong'); wrongThisQuestion.current = true
        const retryToken = guard.current.rearm(questionId, token)
        if (retryToken !== null) setActionToken(retryToken)
        return
      }
      setFeedback('right')
      if (!wrongThisQuestion.current) {
        firstScore.current += 1
        setFirstCorrect(firstScore.current)
      }
      // A distinct guarded Continue event preserves visible correct feedback before changing questions.
      setActionToken(guard.current.setQuestion(`${step}:continue:${run.sessionId}`))
    })
  }

  const continueBasket = (token: number) => {
    if (!run || feedback !== 'right') return
    if (!validateBasket(basket, PRODUCTS, run.quest.basket).valid) {
      // Recheck at the transition boundary in case the basket changed after confirmation.
      setFeedback(null)
      setBasketError(true)
      setActionToken(guard.current.setQuestion(`basket:${run.sessionId}`))
      return
    }
    guard.current.submit(`basket-next:${run.sessionId}`, token, () => {
      const destination = run.quest.multiplication ? 'multiply' : 'total'
      setStep(destination); setInput(''); setFeedback(null)
      setActionToken(guard.current.setQuestion(`${destination}:${run.sessionId}`))
    })
  }

  const continueNumber = (token: number, answeredStep: Step, quest: ShoppingQuest) => {
    if (!run || feedback !== 'right') return
    const id = `${answeredStep}:continue:${run.sessionId}`
    guard.current.submit(id, token, () => {
      const destination = nextStep(answeredStep, quest)
      if (destination === 'finish') {
        if (!completed.current) {
          completed.current = true
          completeSession({ sessionId: run.sessionId, appId: 'shopping', modeId: quest.modeId, stageId: quest.id, questionCount: quest.multiplication ? 3 : 2, firstCorrectCount: firstScore.current, completedAt: new Date().toISOString() })
        }
        setScreen('result')
      } else {
        setStep(destination); setInput(''); setHint(false); setFeedback(null); wrongThisQuestion.current = false
        setActionToken(guard.current.setQuestion(`${destination}:${run.sessionId}`))
      }
    })
  }

  const ownedStamps = progress.rewards.stamp.filter(id => id.startsWith('stamp:quest-'))
  const stepLabel = step === 'basket' ? 'かごをつくる' : step === 'multiply' ? 'かけ算にチャレンジ' : step === 'total' ? 'ぜんぶでいくら？' : 'おつりはいくら？'

  return <GameLayout title="おかいものクエスト" description="かごをととのえて、お金の計算にチャレンジしよう！">
    {storageStatus !== 'ready' && <p className="shop-storage" role="status">記録を保存できないことがあります。それでもあそべるよ。</p>}
    {screen === 'select' && <section className="shop-panel">
      <div className="shop-panel-head"><div><p className="shop-kicker">おみせのぼうけん</p><h2>どのおつかいにする？</h2><p>クリアしたクエストは、何度でもあそべるよ。</p></div><button className="shop-secondary" onClick={() => setScreen('stamps')}>スタンプを見る <span>{ownedStamps.length}/6</span></button></div>
      <div className="shop-quests">{SHOPPING_QUESTS.map((quest, index) => {
        const stampId = `stamp:${quest.id.replace('shopping:', '')}`
        const owned = progress.rewards.stamp.includes(stampId)
        return <button key={quest.id} className={`shop-quest ${owned ? 'is-owned' : ''}`} onClick={() => begin(quest)}>
          <span className="shop-quest-number">おつかい {String(index + 1).padStart(2, '0')}</span><span className="shop-quest-icon" aria-hidden="true">{['🍎','🍪','✏️','🥕','🍬','✏️'][index]}</span>
          <strong>{quest.title}</strong><span className="shop-quest-desc">{quest.modeId === 'standard' ? 'かご・合計・おつり' : quest.modeId === 'multiplication-count' ? 'かご・かけ算・合計・おつり' : 'かご・金額のかけ算・合計・おつり'}</span>
          <span className="shop-quest-badge">{owned ? '★ クリアずみ' : 'おつかいへ →'}</span>
        </button>
      })}</div>
    </section>}

    {screen === 'play' && run && <section className="shop-panel shop-play">
      <div className="shop-play-head"><div><p className="shop-kicker">{run.quest.title}</p><h2>{stepLabel}</h2></div><button className="shop-text-button" onClick={() => setScreen('select')}>クエストをやめる</button></div>
      <p className="shop-story">{run.quest.story}</p>
      <div className="shop-progress" aria-label={`いまのステップ：${stepLabel}`}>
        {(run.quest.multiplication ? ['かご','かけ算','合計','おつり'] : ['かご','合計','おつり']).map((label, i) => <span key={label} className={(i === 0 && step === 'basket') || (i === 1 && step === (run.quest.multiplication ? 'multiply' : 'total')) || (i === 2 && step === (run.quest.multiplication ? 'total' : 'change')) || (i === 3 && step === 'change') ? 'current' : ''}>{label}</span>)}
      </div>
      {step === 'basket' ? <>
        <p className="shop-prompt">{run.quest.basketPrompt}</p>
        <div className="shop-product-grid">{PRODUCTS.map(product => {
          const line = basket.find(item => item.productId === product.id)
          const quantity = line?.quantity ?? 0
          return <article className={`shop-product ${quantity ? 'in-basket' : ''}`} key={product.id}>
            <span className="shop-product-emoji" aria-hidden="true">{product.id === 'apple' ? '🍎' : product.id === 'bread' ? '🥖' : product.id === 'milk' ? '🥛' : product.id === 'candy' ? '🍬' : product.id === 'notebook' ? '📒' : product.id === 'pencil' ? '✏️' : product.id === 'juice' ? '🧃' : product.id === 'carrot' ? '🥕' : '🍪'}</span>
            <strong>{product.name}</strong><span>{product.priceYen}円 / {product.unit}</span>
            <div className="shop-quantity"><button type="button" onClick={() => changeQuantity(product.id, quantity - 1)} aria-label={`${product.name}を1${product.unit}へらす`} disabled={!quantity}>−</button><output aria-label={`${product.name}のかごの数`}>{quantity}</output><button type="button" onClick={() => changeQuantity(product.id, quantity + 1)} aria-label={`${product.name}を1${product.unit}ふやす`}>＋</button></div>
          </article>
        })}</div>
        <div className="shop-basket-summary"><strong>いまのかご</strong>{basket.length ? basket.map(line => { const item = PRODUCTS.find(product => product.id === line.productId)!; return <span key={line.productId}>{item.name} {line.quantity}{item.unit}<button className="shop-remove" onClick={() => changeQuantity(item.id, 0)} aria-label={`${item.name}をかごからとりけす`}>とりけす</button></span> }) : <span>まだ何も入っていないよ</span>}</div>
        {basketError && <Feedback kind="retry">おつかいの品と数をたしかめて、かごをなおそう。</Feedback>}
        {feedback === 'right' && <Feedback kind="correct">ぴったり！ かごができたよ。</Feedback>}
        {feedback === 'right' ? <button className="shop-primary" onKeyDown={event => { if (event.key === 'Enter' && event.repeat) event.preventDefault() }} onClick={() => continueBasket(actionToken)}>計算へすすむ <span>→</span></button> : <button className="shop-primary" onKeyDown={event => { if (event.key === 'Enter' && event.repeat) event.preventDefault() }} onClick={() => submitBasket(actionToken)}>このかごで決定 <span>→</span></button>}
      </> : <>
        <div className="shop-question-card"><span className="shop-question-mark" aria-hidden="true">?</span><h3>{step === 'multiply' ? run.quest.multiplication?.question : step === 'total' ? 'かごの品ものは、ぜんぶで何円かな？' : `${run.quest.paidYen}円をはらったよ。おつりはいくらかな？`}</h3>{step === 'change' && <p>はらうお金：<strong>{run.quest.paidYen}円</strong></p>}</div>
        {feedback === 'wrong' && <Feedback kind="retry">もういちど考えてみよう。かごはそのままだよ。</Feedback>}
        <div className="shop-preserved-basket" aria-label="かごの中身">
          <strong>かごの中身</strong>
          {basket.map(line => {
            const product = PRODUCTS.find(item => item.id === line.productId)!
            return <span key={line.productId}>{product.name}：{line.quantity}{product.unit}　{product.priceYen}円 / {product.unit}</span>
          })}
        </div>
        {feedback === 'right' && <Feedback kind="correct">せいかい！ {step === 'multiply' ? 'つぎは合計を考えよう。' : step === 'total' ? 'つぎはおつりを考えよう。' : 'おつかいクリア！'}</Feedback>}
        {hint && <Feedback kind="hint">{step === 'multiply' ? run.quest.multiplication?.hint : step === 'total' ? run.quest.hints.total : run.quest.hints.change}</Feedback>}
        <div className="shop-answer"><NumberInput label={`こたえ（${unitFor(run.quest, step)}）`} value={input} onChange={setInput} disabled={feedback === 'right'} maxLength={4} onKeyDown={event => { if (event.key === 'Enter' && !event.repeat && feedback !== 'right') { event.preventDefault(); submitAnswer(actionToken) } }} />
          <div className="shop-answer-actions">{feedback === 'right' ? <button className="shop-primary" onKeyDown={event => { if (event.key === 'Enter' && event.repeat) event.preventDefault() }} onClick={() => continueNumber(actionToken, step, run.quest)}>つぎへすすむ <span>→</span></button> : <button className="shop-primary" onKeyDown={event => { if (event.key === 'Enter' && event.repeat) event.preventDefault() }} onClick={() => submitAnswer(actionToken)}>こたえる</button>}<button className="shop-secondary" onClick={() => setHint(value => !value)} aria-expanded={hint}>{hint ? 'ヒントをとじる' : 'ヒントを見る'}</button></div>
        </div>
      </>}
    </section>}

    {screen === 'result' && run && <section className="shop-panel shop-result"><div className="shop-result-stamp" aria-hidden="true">★</div><p className="shop-kicker">おつかい クリア！</p><h2>{run.quest.title}のスタンプをもらったよ！</h2><p className="shop-score">はじめに正解した数 <strong>{firstCorrect} / {run.quest.multiplication ? 3 : 2}</strong></p><p className="shop-result-note">{run.quest.multiplication ? 'かご・かけ算・合計・おつり' : 'かご・合計・おつり'} ができたね。</p><div className="shop-result-actions"><button className="shop-primary" onClick={() => setScreen('stamps')}>スタンプを見る</button><button className="shop-secondary" onClick={() => setScreen('select')}>ほかのおつかいへ</button><button className="shop-secondary" onClick={() => begin(run.quest)}>もういちどあそぶ</button></div></section>}

    {screen === 'stamps' && <section className="shop-panel"><div className="shop-panel-head"><div><p className="shop-kicker">クリアのきろく</p><h2>おつかいスタンプ</h2><p>{ownedStamps.length} / 6 こ あつまったよ！</p></div><button className="shop-secondary" onClick={() => setScreen(completed.current && run ? 'result' : 'select')}>もどる</button></div><div className="shop-stamps">{SHOPPING_QUESTS.map((quest, i) => { const owned = progress.rewards.stamp.includes(`stamp:${quest.id.replace('shopping:', '')}`); return <div className={`shop-stamp ${owned ? 'is-owned' : ''}`} key={quest.id}><span aria-hidden="true">{owned ? '★' : '☆'}</span><strong>{quest.title}</strong><small>{owned ? 'クリア！' : 'クエストにちょうせん'}</small><em>{String(i + 1).padStart(2, '0')}</em></div> })}</div><button className="shop-primary shop-stamps-start" onClick={() => setScreen('select')}>クエストをえらぶ</button></section>}
  </GameLayout>
}
