import type { KeyboardEvent } from 'react'
import { useId } from 'react'
type NumberInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  maxLength?: number
  className?: string
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}
export default function NumberInput({ label, value, onChange, disabled = false, maxLength = 4, className = '', onKeyDown }: NumberInputProps) {
  const id = useId()
  const append = (digit: string) => { if (value.length < maxLength) onChange(value + digit) }
  return <div className={`number-entry ${className}`}>
    <label htmlFor={id}>{label}</label>
    <input id={id} className="number-display" type="text" inputMode="numeric" aria-label={label} value={value} maxLength={maxLength} disabled={disabled}
      onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
      onKeyDown={(event) => onKeyDown?.(event)} />
    <div className="number-pad" aria-label="数字ボタン">
      {[1,2,3,4,5,6,7,8,9,0].map((digit) => <button key={digit} type="button" disabled={disabled} onClick={() => append(String(digit))}>{digit}</button>)}
      <button type="button" className="pad-action" disabled={disabled} onClick={() => onChange(value.slice(0, -1))} aria-label="一文字けす">⌫</button>
      <button type="button" className="pad-action" disabled={disabled} onClick={() => onChange('')}>けす</button>
    </div>
  </div>
}
