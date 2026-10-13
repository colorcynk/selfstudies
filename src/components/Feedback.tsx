import type { ReactNode } from 'react'
export type FeedbackKind = 'correct' | 'retry' | 'hint' | 'neutral'
type FeedbackProps = { kind: FeedbackKind; children: ReactNode; className?: string }
export default function Feedback({ kind, children, className = '' }: FeedbackProps) {
  return <div className={`feedback feedback-${kind} ${className}`} role={kind === 'correct' || kind === 'retry' ? 'status' : 'note'} aria-live="polite">{children}</div>
}
