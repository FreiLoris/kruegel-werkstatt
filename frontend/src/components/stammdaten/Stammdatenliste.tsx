import { ArrowDown, ArrowUp, Pencil, Plus, PowerOff, RotateCcw } from 'lucide-react'
import { verschoben } from '../../lib/reihenfolge'
import { Button } from '../ui/Button'
import styles from './Stammdatenliste.module.css'

/** Was jeder Eintrag mitbringen muss (Lift, Serviceleistung, …). */
export interface Stammdatum {
  id: string
  name: string
  aktiv: boolean
}

export interface StammdatenlisteTexte {
  titel: string
  beschreibung: string
  /** z. B. "Lift hinzufügen" */
  neu: string
  /** z. B. "Stilllegen" / "Nicht mehr anbieten" */
  deaktivieren: string
  /** Überschrift der eingeklappten Liste, z. B. "Stillgelegt" */
  inaktiv: string
  /** z. B. "Wieder in Betrieb" / "Wieder anbieten" */
  aktivieren: string
}

interface StammdatenlisteProps<T extends Stammdatum> {
  /** Alle Einträge in fester Reihenfolge, aktive und inaktive */
  eintraege: T[]
  texte: StammdatenlisteTexte
  /** Nein bei «nur ansehen» → keine Knöpfe */
  darfAendern: boolean
  /** Läuft gerade eine Änderung? → Knöpfe kurz sperren (kein Doppelklick) */
  beschaeftigt: boolean
  /** Der letzte aktive Eintrag darf nicht deaktiviert werden (z. B. Lifts) */
  mindestensEinerAktiv?: boolean
  onNeu: () => void
  onUmbenennen: (eintrag: T) => void
  onDeaktivieren: (eintrag: T) => void
  onAktivieren: (eintrag: T) => void
  /** Neue Reihenfolge der aktiven Einträge (IDs, erste = oben) */
  onReihenfolge: (ids: string[]) => void
}

/**
 * Einfache Stammdaten mit Name und fester Reihenfolge: Liste mit ↑/↓, Umbenennen,
 * Deaktivieren und eingeklappten inaktiven Einträgen. Rein darstellend – Speichern,
 * Rückfragen und Meldungen macht die aufrufende Komponente (z. B. `LiftVerwaltung`).
 */
export function Stammdatenliste<T extends Stammdatum>({
  eintraege,
  texte,
  darfAendern,
  beschaeftigt,
  mindestensEinerAktiv = false,
  onNeu,
  onUmbenennen,
  onDeaktivieren,
  onAktivieren,
  onReihenfolge,
}: StammdatenlisteProps<T>) {
  const aktive = eintraege.filter((e) => e.aktiv)
  const inaktive = eintraege.filter((e) => !e.aktiv)
  const letzterGeschuetzt = mindestensEinerAktiv && aktive.length <= 1

  return (
    <>
      <div className={styles.kopf}>
        <div>
          <h2>{texte.titel}</h2>
          <p className="gedaempft">{texte.beschreibung}</p>
        </div>
        {darfAendern && (
          <Button icon={Plus} onClick={onNeu}>
            {texte.neu}
          </Button>
        )}
      </div>

      {aktive.length === 0 ? (
        <p className={styles.leer}>Keine Einträge.</p>
      ) : (
        <ol className={styles.liste}>
          {aktive.map((eintrag, index) => (
            <li key={eintrag.id} className={styles.zeile}>
              <span className={styles.nummer} aria-hidden>
                {index + 1}
              </span>
              <span className={styles.name}>{eintrag.name}</span>
              {darfAendern && (
                <span className={styles.aktionen}>
                  <Button
                    variante="ghost"
                    icon={ArrowUp}
                    aria-label={`${eintrag.name} nach oben`}
                    title="Nach oben"
                    disabled={index === 0 || beschaeftigt}
                    onClick={() => onReihenfolge(verschoben(aktive.map((e) => e.id), index, -1))}
                  />
                  <Button
                    variante="ghost"
                    icon={ArrowDown}
                    aria-label={`${eintrag.name} nach unten`}
                    title="Nach unten"
                    disabled={index === aktive.length - 1 || beschaeftigt}
                    onClick={() => onReihenfolge(verschoben(aktive.map((e) => e.id), index, 1))}
                  />
                  <Button variante="ghost" icon={Pencil} onClick={() => onUmbenennen(eintrag)} aria-label={`${eintrag.name} umbenennen`}>
                    Umbenennen
                  </Button>
                  <Button
                    variante="ghost"
                    icon={PowerOff}
                    onClick={() => onDeaktivieren(eintrag)}
                    // Backend würde ablehnen – Knopf gar nicht erst anbieten
                    disabled={letzterGeschuetzt || beschaeftigt}
                    title={letzterGeschuetzt ? 'Mindestens einer muss aktiv bleiben' : undefined}
                    aria-label={`${eintrag.name}: ${texte.deaktivieren}`}
                  >
                    {texte.deaktivieren}
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {inaktive.length > 0 && (
        <details className={styles.inaktiv}>
          <summary>
            {texte.inaktiv} ({inaktive.length})
          </summary>
          <ul className={styles.inaktivListe}>
            {inaktive.map((eintrag) => (
              <li key={eintrag.id}>
                <span className="gedaempft">{eintrag.name}</span>
                {darfAendern && (
                  <Button klein icon={RotateCcw} onClick={() => onAktivieren(eintrag)} disabled={beschaeftigt}>
                    {texte.aktivieren}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
