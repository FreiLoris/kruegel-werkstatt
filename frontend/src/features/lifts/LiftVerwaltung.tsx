import { ArrowDown, ArrowUp, Pencil, Plus, PowerOff, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useDarfAendern } from '../../app/person/useGeraetPerson'
import { useBestaetigung } from '../../components/ui/bestaetigungKontext'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastKontext'
import { verschoben } from '../../lib/reihenfolge'
import { LiftDialog } from './LiftDialog'
import { useAlleLifts, useLiftAktivSetzen, useLiftReihenfolge, type Lift } from './liftApi'
import styles from './LiftVerwaltung.module.css'

type Dialog = { art: 'neu' } | { art: 'umbenennen'; lift: Lift } | null

/**
 * Lifts verwalten: Anzahl, Namen, Reihenfolge (= Spalten von links nach rechts).
 * Früher fest «Lift 1/2/3» im Code (Bug #13).
 */
export function LiftVerwaltung() {
  const { data: alle, error, isPending, refetch } = useAlleLifts()
  const darfAendern = useDarfAendern()
  const reihenfolge = useLiftReihenfolge()
  const aktivSetzen = useLiftAktivSetzen()
  const toast = useToast()
  const bestaetige = useBestaetigung()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) return <p className="gedaempft">Lade Lifts …</p>
  if (error) {
    return (
      <>
        <p className={styles.fehler}>Lifts konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  const aktive = alle.filter((l) => l.aktiv)
  const stillgelegte = alle.filter((l) => !l.aktiv)

  function verschieben(index: number, richtung: -1 | 1) {
    reihenfolge.mutate(verschoben(aktive.map((l) => l.id), index, richtung), {
      onError: (fehler) => toast.fehler(`Reihenfolge nicht gespeichert: ${fehler.message}`),
    })
  }

  async function stilllegen(lift: Lift) {
    const ok = await bestaetige({
      titel: `${lift.name} stilllegen?`,
      text: `${lift.name} hat danach keine Spalte mehr und ist bei Terminen nicht mehr wählbar. Unter «Stillgelegt» lässt sich das rückgängig machen.`,
      bestaetigenText: 'Stilllegen',
    })
    if (!ok) return
    aktivSetzen.mutate(
      { id: lift.id, aktiv: false },
      {
        onSuccess: () => toast.erfolg(`${lift.name} stillgelegt`),
        // z. B. «Mindestens ein Lift muss in Betrieb bleiben.»
        onError: (fehler) => toast.fehler(fehler.message),
      },
    )
  }

  function inBetriebNehmen(lift: Lift) {
    aktivSetzen.mutate(
      { id: lift.id, aktiv: true },
      {
        onSuccess: () => toast.erfolg(`${lift.name} ist wieder in Betrieb`),
        onError: (fehler) => toast.fehler(`${lift.name} konnte nicht aktiviert werden: ${fehler.message}`),
      },
    )
  }

  return (
    <>
      <div className={styles.kopf}>
        <div>
          <h2>Lifts</h2>
          <p className="gedaempft">Reihenfolge von oben nach unten = Spalten von links nach rechts in Tagesansicht und Dashboard.</p>
        </div>
        {darfAendern && (
          <Button icon={Plus} onClick={() => setDialog({ art: 'neu' })}>
            Lift hinzufügen
          </Button>
        )}
      </div>

      <ol className={styles.liste}>
        {aktive.map((lift, index) => (
          <li key={lift.id} className={styles.zeile}>
            <span className={styles.nummer} aria-hidden>
              {index + 1}
            </span>
            <span className={styles.name}>{lift.name}</span>
            {darfAendern && (
              <span className={styles.aktionen}>
                <Button
                  variante="ghost"
                  icon={ArrowUp}
                  aria-label={`${lift.name} nach oben`}
                  title="Nach oben (weiter links)"
                  disabled={index === 0 || reihenfolge.isPending}
                  onClick={() => verschieben(index, -1)}
                />
                <Button
                  variante="ghost"
                  icon={ArrowDown}
                  aria-label={`${lift.name} nach unten`}
                  title="Nach unten (weiter rechts)"
                  disabled={index === aktive.length - 1 || reihenfolge.isPending}
                  onClick={() => verschieben(index, 1)}
                />
                <Button variante="ghost" icon={Pencil} onClick={() => setDialog({ art: 'umbenennen', lift })} aria-label={`${lift.name} umbenennen`}>
                  Umbenennen
                </Button>
                <Button
                  variante="ghost"
                  icon={PowerOff}
                  onClick={() => void stilllegen(lift)}
                  // Letzter Lift: Backend würde ablehnen – Knopf gar nicht erst anbieten
                  disabled={aktive.length <= 1 || aktivSetzen.isPending}
                  title={aktive.length <= 1 ? 'Mindestens ein Lift muss in Betrieb bleiben' : undefined}
                  aria-label={`${lift.name} stilllegen`}
                >
                  Stilllegen
                </Button>
              </span>
            )}
          </li>
        ))}
      </ol>

      {stillgelegte.length > 0 && (
        <details className={styles.stillgelegt}>
          <summary>Stillgelegt ({stillgelegte.length})</summary>
          <ul className={styles.stillgelegtListe}>
            {stillgelegte.map((lift) => (
              <li key={lift.id}>
                <span className="gedaempft">{lift.name}</span>
                {darfAendern && (
                  <Button klein icon={RotateCcw} onClick={() => inBetriebNehmen(lift)} disabled={aktivSetzen.isPending}>
                    Wieder in Betrieb
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {dialog && (
        <LiftDialog
          key={dialog.art === 'neu' ? 'neu' : dialog.lift.id}
          lift={dialog.art === 'umbenennen' ? dialog.lift : undefined}
          onSchliessen={() => setDialog(null)}
        />
      )}
    </>
  )
}
