import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import styles from './Toast.module.css'
import { ToastKontext, type ToastApi, type ToastArt } from './toastKontext'

interface ToastEintrag {
  id: number
  text: string
  art: ToastArt
}

/** Anzeigedauer – Fehler etwas länger, damit man sie lesen kann */
const DAUER_MS: Record<ToastArt, number> = { erfolg: 3000, info: 4000, fehler: 7000 }

const ICONS = { erfolg: CircleCheck, fehler: CircleAlert, info: Info }

/**
 * Stellt `useToast()` bereit und zeigt die Meldungen an.
 * Position oben rechts – dort verdeckt nichts die Meldung
 * (UI-Review: Toasts lagen hinter dem schwebenden Dashboard-Button).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEintrag[]>([])
  const naechsteId = useRef(1)
  const bereichRef = useRef<HTMLDivElement>(null)

  // Ein offenes Modal (<dialog>) liegt in der obersten Browser-Ebene ("top layer") über allem.
  // Damit Meldungen trotzdem sichtbar sind (z. B. Fehler beim Speichern IM Modal), ist der
  // Toast-Bereich ein Popover – und wird bei jeder neuen Meldung neu geöffnet, wodurch er
  // wieder ganz nach oben kommt.
  useEffect(() => {
    const bereich = bereichRef.current
    if (!bereich || typeof bereich.showPopover !== 'function') return // z. B. in Tests (jsdom)
    if (bereich.matches(':popover-open')) bereich.hidePopover()
    if (toasts.length > 0) bereich.showPopover()
  }, [toasts])

  const entfernen = useCallback((id: number) => {
    setToasts((alle) => alle.filter((t) => t.id !== id))
  }, [])

  const zeigen = useCallback(
    (art: ToastArt, text: string) => {
      const id = naechsteId.current++
      setToasts((alle) => [...alle, { id, text, art }])
      setTimeout(() => entfernen(id), DAUER_MS[art])
    },
    [entfernen],
  )

  const api = useMemo<ToastApi>(
    () => ({
      erfolg: (text) => zeigen('erfolg', text),
      fehler: (text) => zeigen('fehler', text),
      info: (text) => zeigen('info', text),
    }),
    [zeigen],
  )

  return (
    <ToastKontext.Provider value={api}>
      {children}
      <div ref={bereichRef} popover="manual" className={styles.bereich} aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.art]
          return (
            <div key={toast.id} className={`${styles.toast} ${styles[toast.art]}`} role={toast.art === 'fehler' ? 'alert' : 'status'}>
              <Icon className={styles.icon} aria-hidden />
              <span className={styles.text}>{toast.text}</span>
              <button type="button" className={styles.schliessen} onClick={() => entfernen(toast.id)} aria-label="Meldung schliessen">
                <X aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastKontext.Provider>
  )
}
