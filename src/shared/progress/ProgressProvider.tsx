import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { addCompletion, emptyProgress } from './reducer'
import { clearProgress, loadProgress, saveProgress } from './storage'
import type { CompletionRecord, Progress, StorageStatus } from './types'
import { validateCompletionRecord } from './catalog'

interface ProgressContextValue {
  progress: Progress
  storageStatus: StorageStatus
  completeSession(record: CompletionRecord): boolean
  resetProgress(): void
}
const Context = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadProgress)
  const [progress, setProgress] = useState(initial.progress)
  const [storageStatus, setStorageStatus] = useState(initial.storageStatus)
  const sessions = useRef(new Set(initial.progress.history.map((r) => r.sessionId)))
  const latestProgress = useRef(initial.progress)
  const statusRef = useRef(initial.storageStatus)

  const completeSession = useCallback((record: CompletionRecord) => {
    if (!validateCompletionRecord(record) || sessions.current.has(record.sessionId)) return false
    sessions.current.add(record.sessionId)
    const next = addCompletion(latestProgress.current, record)
    latestProgress.current = next
    setProgress(next)
    if (statusRef.current !== 'unknown-version') {
      const nextStatus = saveProgress(next) ? 'ready' : 'unavailable'
      statusRef.current = nextStatus
      setStorageStatus(nextStatus)
    }
    return true
  }, [])

  const resetProgress = useCallback(() => {
    setProgress(emptyProgress())
    latestProgress.current = emptyProgress()
    sessions.current = new Set()
    const nextStatus = clearProgress() ? 'ready' : 'unavailable'
    statusRef.current = nextStatus
    setStorageStatus(nextStatus)
  }, [])

  const value = useMemo(() => ({ progress, storageStatus, completeSession, resetProgress }), [progress, storageStatus, completeSession, resetProgress])
  const notice = storageStatus === 'unavailable'
    ? '記録を保存できませんが、あそびは続けられます。'
    : storageStatus === 'corrupt'
      ? '前の記録を読みこめませんでした。新しい記録であそべます。'
      : storageStatus === 'unknown-version'
        ? 'この記録は今のアプリでは読み書きできません。'
        : null
  return <Context.Provider value={value}>
    {notice && <div role="status" aria-live="polite" style={{ boxSizing: 'border-box', width: 'fit-content', maxWidth: 'calc(100% - 24px)', margin: '12px auto', padding: '10px 16px', borderRadius: 12, background: '#fff0e4', color: '#6e421d', fontWeight: 700, boxShadow: '0 3px 12px #40311f25' }}>{notice}</div>}
    {children}
  </Context.Provider>
}

export function useProgress(): ProgressContextValue {
  const value = useContext(Context)
  if (!value) throw new Error('useProgress must be used inside ProgressProvider')
  return value
}
