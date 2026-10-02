import type { LucideIcon } from 'lucide-react'
import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export type ButtonVariante = 'primaer' | 'sekundaer' | 'gefahr' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: ButtonVariante
  klein?: boolean
  /** Symbol links vom Text (aus lucide-react) */
  icon?: LucideIcon
  /** Zeigt einen Lade-Kreisel und sperrt den Button (z. B. während gespeichert wird) */
  laedt?: boolean
}

/**
 * Standard-Button der App.
 *
 * `type="button"` ist Standard – ein Button in einem Formular sendet es also NICHT
 * versehentlich ab. Für Absende-Buttons ausdrücklich `type="submit"` setzen.
 */
export function Button({
  variante = 'sekundaer',
  klein = false,
  icon: Icon,
  laedt = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const klassen = [styles.button, styles[variante], klein && styles.klein, className].filter(Boolean).join(' ')

  return (
    <button type={type} className={klassen} disabled={disabled || laedt} aria-busy={laedt || undefined} {...rest}>
      {laedt ? <LoaderCircle className={styles.kreisel} aria-hidden /> : Icon && <Icon aria-hidden />}
      {children}
    </button>
  )
}
