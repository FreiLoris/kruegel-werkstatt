import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import styles from './Felder.module.css'

/**
 * Eingabefelder mit Beschriftung, Hinweis und Fehlermeldung.
 *
 * Jedes Feld hat IMMER ein sichtbares Label (nie nur einen Platzhalter – der verschwindet
 * beim Tippen und sieht aus wie ein echter Wert, vgl. UI-Review Wizard).
 * Label und Fehlermeldung sind technisch mit dem Feld verknüpft (Screenreader, Klick aufs Label).
 */

interface FeldRahmenProps {
  label: string
  /** Kleiner Hilfetext unter dem Feld */
  hinweis?: string
  /** Fehlermeldung, z. B. aus `apiFehler.meldungFuerFeld('name')` */
  fehler?: string
  pflicht?: boolean
}

interface RahmenInnenProps extends FeldRahmenProps {
  id: string
  children: ReactNode
}

function FeldRahmen({ id, label, hinweis, fehler, pflicht, children }: RahmenInnenProps) {
  return (
    <div className={styles.feld}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {pflicht && <span className={styles.pflicht} aria-hidden> *</span>}
      </label>
      {children}
      {fehler ? (
        <p id={`${id}-meldung`} className={styles.fehler} role="alert">
          {fehler}
        </p>
      ) : (
        hinweis && (
          <p id={`${id}-meldung`} className={styles.hinweis}>
            {hinweis}
          </p>
        )
      )}
    </div>
  )
}

/** Gemeinsame Attribute: Verknüpfung mit Meldung + Fehlerzustand */
function feldAttribute(id: string, props: FeldRahmenProps) {
  return {
    id,
    required: props.pflicht,
    'aria-invalid': props.fehler ? true : undefined,
    'aria-describedby': props.fehler || props.hinweis ? `${id}-meldung` : undefined,
  }
}

export function Textfeld({ label, hinweis, fehler, pflicht, className, ...rest }: FeldRahmenProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <FeldRahmen id={id} label={label} hinweis={hinweis} fehler={fehler} pflicht={pflicht}>
      <input className={[styles.eingabe, className].filter(Boolean).join(' ')} {...feldAttribute(id, { label, hinweis, fehler, pflicht })} {...rest} />
    </FeldRahmen>
  )
}

export function Textbereich({ label, hinweis, fehler, pflicht, className, rows = 4, ...rest }: FeldRahmenProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <FeldRahmen id={id} label={label} hinweis={hinweis} fehler={fehler} pflicht={pflicht}>
      <textarea rows={rows} className={[styles.eingabe, styles.textbereich, className].filter(Boolean).join(' ')} {...feldAttribute(id, { label, hinweis, fehler, pflicht })} {...rest} />
    </FeldRahmen>
  )
}

export function Auswahl({ label, hinweis, fehler, pflicht, className, children, ...rest }: FeldRahmenProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <FeldRahmen id={id} label={label} hinweis={hinweis} fehler={fehler} pflicht={pflicht}>
      <select className={[styles.eingabe, className].filter(Boolean).join(' ')} {...feldAttribute(id, { label, hinweis, fehler, pflicht })} {...rest}>
        {children}
      </select>
    </FeldRahmen>
  )
}

/** Checkbox mit Beschriftung rechts – ganze Zeile ist anklickbar (Touch). */
export function Checkbox({ label, className, ...rest }: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className={[styles.checkbox, className].filter(Boolean).join(' ')}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}
