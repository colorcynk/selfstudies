import type { ReactNode } from 'react'
import { navigate } from '../App'

type GameLayoutProps = { title: string; description?: string; children: ReactNode }
export default function GameLayout({ title, description, children }: GameLayoutProps) {
  return <main className="game-page page-wrap">
    <button className="back-link" onClick={() => navigate('/')} aria-label="ホームにもどる">← ホーム</button>
    <header className="game-heading"><span className="eyebrow">まなびのゲームひろば</span><h1>{title}</h1>{description && <p>{description}</p>}</header>
    <section className="game-content">{children}</section>
  </main>
}
