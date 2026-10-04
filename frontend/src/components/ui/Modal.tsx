import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Modal.module.css'

export interface ModalProps {
  open: boolean
  /** Called on Esc, click on the backdrop or the X */
  onClose: () => void
  title: string
  children: ReactNode
  /** Buttons at the bottom – always stay visible while scrolling */
  footer?: ReactNode
  wide?: boolean
}

/**
 * Dialog window based on the native HTML element `<dialog>`.
 *
 * The browser takes care of: focus stays inside the dialog, background is blocked,
 * Esc closes. Header and footer stay fixed, only the body scrolls
 * (UI review: the save button was only reachable after scrolling).
 *
 * Focus on open: the element with `data-autofocus`, otherwise the first input field.
 * Do not use React's `autoFocus` inside a modal – it has no effect there.
 */
export function Modal({ open, onClose, title, children, footer, wide = false }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Unique ID – several dialogs can be open at once (e.g. confirmation above a form)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // The browser focuses the first focusable element – that would be the X, and Enter would
      // close the dialog. React's `autoFocus` does not help: it runs while the dialog is still
      // closed. So: focus the element marked with `data-autofocus`, otherwise the first field.
      const target =
        dialog.querySelector<HTMLElement>('[data-autofocus]') ?? dialog.querySelector<HTMLElement>('input, select, textarea')
      target?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={[styles.dialog, wide && styles.wide].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      // Esc: the browser would close on its own – we let React control the state.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // Click on the dimmed backdrop (= the dialog element itself, not its content)
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className={styles.frame}>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Schliessen">
              <X aria-hidden />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
