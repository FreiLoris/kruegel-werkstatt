import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import styles from './Toast.module.css'
import { ToastContext, type ToastApi, type ToastKind } from './toastContext'

interface ToastEntry {
  id: number
  text: string
  kind: ToastKind
}

/** Display time – errors a bit longer so they can be read */
const DURATION_MS: Record<ToastKind, number> = { success: 3000, info: 4000, error: 7000 }

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info }

/**
 * Provides `useToast()` and shows the messages.
 * Position top right – nothing covers the message there
 * (UI review: toasts were hidden behind the floating dashboard button).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(1)
  const regionRef = useRef<HTMLDivElement>(null)

  // An open modal (<dialog>) lies in the browser's top layer above everything.
  // So that messages are still visible (e.g. a save error IN the modal), the toast region is
  // a popover – and is reopened on every new message, which puts it on top again.
  useEffect(() => {
    const region = regionRef.current
    if (!region || typeof region.showPopover !== 'function') return // e.g. in tests (jsdom)
    if (region.matches(':popover-open')) region.hidePopover()
    if (toasts.length > 0) region.showPopover()
  }, [toasts])

  const remove = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (kind: ToastKind, text: string) => {
      const id = nextId.current++
      setToasts((all) => [...all, { id, text, kind }])
      setTimeout(() => remove(id), DURATION_MS[kind])
    },
    [remove],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => show('success', text),
      error: (text) => show('error', text),
      info: (text) => show('info', text),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div ref={regionRef} popover="manual" className={styles.region} aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind]
          return (
            <div key={toast.id} className={`${styles.toast} ${styles[toast.kind]}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
              <Icon className={styles.icon} aria-hidden />
              <span className={styles.text}>{toast.text}</span>
              <button type="button" className={styles.close} onClick={() => remove(toast.id)} aria-label="Meldung schliessen">
                <X aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
