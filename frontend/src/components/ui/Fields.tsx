import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import styles from './Fields.module.css'

/**
 * Input fields with label, hint and error message.
 *
 * Every field ALWAYS has a visible label (never just a placeholder – that disappears while
 * typing and looks like a real value, see UI review of the wizard).
 * Label and error message are technically linked to the field (screen readers, click on label).
 */

interface FieldFrameProps {
  label: string
  /** Small help text below the field */
  hint?: string
  /** Error message, e.g. from `apiError.messageForField('name')` */
  error?: string
  required?: boolean
}

interface FrameInnerProps extends FieldFrameProps {
  id: string
  children: ReactNode
}

function FieldFrame({ id, label, hint, error, required, children }: FrameInnerProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} className={styles.error} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-message`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** Shared attributes: link to the message + error state */
function fieldAttributes(id: string, props: FieldFrameProps) {
  return {
    id,
    required: props.required,
    'aria-invalid': props.error ? true : undefined,
    'aria-describedby': props.error || props.hint ? `${id}-message` : undefined,
  }
}

export function TextField({ label, hint, error, required, className, ...rest }: FieldFrameProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required}>
      <input className={[styles.input, className].filter(Boolean).join(' ')} {...fieldAttributes(id, { label, hint, error, required })} {...rest} />
    </FieldFrame>
  )
}

export function TextArea({ label, hint, error, required, className, rows = 4, ...rest }: FieldFrameProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required}>
      <textarea rows={rows} className={[styles.input, styles.textarea, className].filter(Boolean).join(' ')} {...fieldAttributes(id, { label, hint, error, required })} {...rest} />
    </FieldFrame>
  )
}

export function Select({ label, hint, error, required, className, children, ...rest }: FieldFrameProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required}>
      <select className={[styles.input, className].filter(Boolean).join(' ')} {...fieldAttributes(id, { label, hint, error, required })} {...rest}>
        {children}
      </select>
    </FieldFrame>
  )
}

/** Checkbox with label on the right – the whole row is clickable (touch). */
export function Checkbox({ label, className, ...rest }: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className={[styles.checkbox, className].filter(Boolean).join(' ')}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}
