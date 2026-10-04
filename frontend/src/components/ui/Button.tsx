import type { LucideIcon } from 'lucide-react'
import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  small?: boolean
  /** Icon left of the text (from lucide-react) */
  icon?: LucideIcon
  /** Shows a spinner and disables the button (e.g. while saving) */
  loading?: boolean
}

/**
 * The app's standard button.
 *
 * `type="button"` is the default – a button inside a form does NOT submit it by accident.
 * For submit buttons set `type="submit"` explicitly.
 */
export function Button({
  variant = 'secondary',
  small = false,
  icon: Icon,
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], small && styles.small, className].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <LoaderCircle className={styles.spinner} aria-hidden /> : Icon && <Icon aria-hidden />}
      {children}
    </button>
  )
}
