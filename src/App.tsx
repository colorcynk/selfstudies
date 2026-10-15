import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Monsters from './apps/monsters'
import Shopping from './apps/shopping'
import Kanji from './apps/kanji'
import Calculation from './apps/calculation'
import Geometry from './apps/geometry'

const routes: Record<string, ComponentType> = {
  '/': Home, '/monsters': Monsters, '/shopping': Shopping,
  '/kanji': Kanji, '/calculation': Calculation, '/geometry': Geometry, '/settings': Settings,
}
function currentPath() {
  const path = window.location.hash.slice(1) || '/'
  return Object.hasOwn(routes, path) ? path : '/'
}
export function navigate(path: string) { window.location.hash = path }
export default function App() {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const update = () => setPath(currentPath())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  const Page = routes[path] ?? Home
  return <Page key={path} />
}
