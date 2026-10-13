import { navigate } from '../App'
import { useProgress } from '../shared/progress/ProgressProvider'
const games = [
  { path: '/monsters', title: '九九モンスター', subtitle: '九九をといて、なかまをふやそう！', icon: '✦', color: 'melon', tag: 'さんすう' },
  { path: '/shopping', title: 'おかいものクエスト', subtitle: 'おつりを計算して、おつかい名人！', icon: '▣', color: 'blueberry', tag: 'さんすう' },
  { path: '/kanji', title: 'かん字たんけん隊', subtitle: 'ことばの森で、かん字を見つけよう！', icon: '文', color: 'grape', tag: 'こくご' },
  { path: '/calculation', title: '100ます計算', subtitle: '自分のペースで、どんどんチャレンジ！', icon: '＋', color: 'leaf', tag: 'さんすう' },
]
export default function Home() {
  const { progress } = useProgress()
  const totalRewards = Object.values(progress.rewards).reduce((sum, rewards) => sum + rewards.length, 0)
  return <main className="home-page page-wrap">
    <header className="site-header">
      <a href="#/" className="brand" aria-label="まなびのゲームひろば ホーム"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M24 4 29 17 43 18 32 27 36 41 24 33 12 41 16 27 5 18 19 17Z"/><circle cx="24" cy="24" r="4"/></svg></span><span>まなびのゲームひろば</span></a>
      <button className="settings-button" onClick={() => navigate('/settings')} aria-label="おうちの人の設定">⚙ <span>おうちの人</span></button>
    </header>
    <section className="hero">
      <div className="hero-copy"><p className="hero-kicker"><span>★</span> あそんで まなんで だいぼうけん！</p><h1>きょうは、<br/><span>なにしてあそぶ？</span></h1><p>すきなゲームをえらんでね。<br/>きみのペースで、ゆっくり楽しもう！</p></div>
      <div className="hero-art" aria-hidden="true"><svg viewBox="0 0 300 230"><path className="art-sun-rays" d="M226 27v17m0 85v17m-66-59h-17m183 0h-17m-129-46-12-12m117 117-12-12m0-93 12-12m-117 117 12-12"/><circle cx="226" cy="87" r="35" className="art-sun-core"/><path d="M42 177c14-40 60-50 78-6 15-37 57-40 74 6" className="art-hill"/><path d="M84 186c13-34 38-37 50 0" className="art-book"/><path d="m105 186 4-25 18 0 6 25" className="art-book-page"/><circle cx="67" cy="69" r="4" className="art-star"/><path d="m142 44 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" className="art-star"/></svg></div>
      <div className="hero-doodle doodle-one" aria-hidden="true">✳</div><div className="hero-doodle doodle-two" aria-hidden="true">• • •</div>
    </section>
    <section className="section-title" aria-label="あそびのきろく"><div><span className="eyebrow">MY PROGRESS</span><h2>あそびのきろく</h2></div><p>さいきんのきろく {progress.history.length}回 ・ {totalRewards}こ あつめたよ</p></section>
    <section className="games-section" aria-labelledby="games-heading"><div className="section-title"><div><span className="eyebrow">PLAY & LEARN</span><h2 id="games-heading">ゲームをえらぼう</h2></div><span className="tiny-spark" aria-hidden="true">✦</span></div>
      <div className="game-grid">{games.map((game, index) => <button className={`game-card ${game.color}`} key={game.path} onClick={() => navigate(game.path)}>
        <span className="card-top"><span className="game-tag">{game.tag}</span><span className="card-number">0{index + 1}</span></span><span className="game-icon" aria-hidden="true">{game.icon}</span><span className="game-title">{game.title}</span><span className="game-subtitle">{game.subtitle}</span><span className="card-play">あそぶ <span aria-hidden="true">→</span></span>
      </button>)}</div>
    </section>
    <footer className="home-footer"><span>きょうも ひとつ、できた！をふやそう。</span><span aria-hidden="true">☀</span></footer>
  </main>
}
