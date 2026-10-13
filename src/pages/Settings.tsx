import { navigate } from '../App'
import { GameLayout } from '../components'
import { useProgress } from '../shared/progress/ProgressProvider'
export default function Settings() {
  const { progress, storageStatus, resetProgress } = useProgress()
  const statusMessage = storageStatus === 'unavailable' ? 'このブラウザでは記録を保存できません。ゲームはそのまま遊べます。' : storageStatus === 'corrupt' ? '記録を読みこめなかったので、新しい記録で遊べます。' : storageStatus === 'unknown-version' ? 'この記録は新しい形式です。今のアプリからは読み書きしません。' : '記録はこの端末の、このブラウザに保存されます。'
  function confirmReset() {
    if (window.confirm('このアプリの記録をすべて消します。よろしいですか？')) resetProgress()
  }
  return <GameLayout title="おうちの人の設定" description="記録やアプリの設定を確認できます。"><div className="settings-panel"><div className="settings-icon" aria-hidden="true">☀</div><h2>あそびのきろく</h2><p>このアプリは、同じブラウザを使う1人分の記録を保存します。</p><p>{statusMessage}</p><p className="settings-note">ブラウザのデータを消すと、記録も消えます。記録はほかの端末にはうつりません。</p><p>さいきんのきろく：{progress.history.length}回 ・ あつめたもの：{progress.rewards.monster.length + progress.rewards.stamp.length + progress.rewards.treasure.length}こ</p><button className="primary-button" onClick={confirmReset}>記録をぜんぶ消す</button><button className="primary-button" onClick={() => navigate('/')}>ホームにもどる</button></div></GameLayout>
}
