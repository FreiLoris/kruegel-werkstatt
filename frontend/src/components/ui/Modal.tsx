import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Modal.module.css'

export interface ModalProps {
  offen: boolean
  /** Wird bei Esc, Klick auf den Hintergrund oder das X aufgerufen */
  onSchliessen: () => void
  titel: string
  children: ReactNode
  /** Buttons unten – bleiben beim Scrollen immer sichtbar */
  fuss?: ReactNode
  breit?: boolean
}

/**
 * Dialogfenster auf Basis des nativen HTML-Elements `<dialog>`.
 *
 * Der Browser übernimmt: Fokus bleibt im Dialog, Hintergrund ist gesperrt,
 * Esc schliesst. Kopf und Fuss bleiben fix, nur der Inhalt scrollt
 * (UI-Review: Speichern-Button war nur nach Scrollen erreichbar).
 */
export function Modal({ offen, onSchliessen, titel, children, fuss, breit = false }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Eindeutige ID – es können mehrere Dialoge gleichzeitig offen sein (z. B. Bestätigung über Formular)
  const titelId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (offen && !dialog.open) {
      dialog.showModal()
    } else if (!offen && dialog.open) {
      dialog.close()
    }
  }, [offen])

  return (
    <dialog
      ref={dialogRef}
      className={[styles.dialog, breit && styles.breit].filter(Boolean).join(' ')}
      aria-labelledby={titelId}
      // Esc: Browser würde selbst schliessen – wir lassen React den Zustand steuern.
      onCancel={(event) => {
        event.preventDefault()
        onSchliessen()
      }}
      // Klick auf den abgedunkelten Hintergrund (= das dialog-Element selbst, nicht sein Inhalt)
      onClick={(event) => {
        if (event.target === event.currentTarget) onSchliessen()
      }}
    >
      {offen && (
        <div className={styles.rahmen}>
          <header className={styles.kopf}>
            <h2 id={titelId} className={styles.titel}>
              {titel}
            </h2>
            <button type="button" className={styles.schliessen} onClick={onSchliessen} aria-label="Schliessen">
              <X aria-hidden />
            </button>
          </header>
          <div className={styles.inhalt}>{children}</div>
          {fuss && <footer className={styles.fuss}>{fuss}</footer>}
        </div>
      )}
    </dialog>
  )
}
