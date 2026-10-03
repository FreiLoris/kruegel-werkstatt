import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useDarfAendern } from '../../app/person/useGeraetPerson'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastKontext'
import { formatDatum } from '../../lib/format'
import { MitarbeiterDialog } from './MitarbeiterDialog'
import { ROLLEN, useAlleMitarbeiter, useMitarbeiterAktivSetzen, useMitarbeiterReihenfolge, type Mitarbeiter } from './mitarbeiterApi'
import styles from './MitarbeiterSeite.module.css'
import { Namensschild } from './Namensschild'

/** Welcher Dialog offen ist: keiner, "neu" oder eine bestimmte Person */
type Dialog = { art: 'neu' } | { art: 'bearbeiten'; mitarbeiter: Mitarbeiter } | null

/**
 * Verwaltung der Mitarbeitenden: Liste in fester Reihenfolge (= Reihenfolge auf Pinnwand
 * und in Auswahllisten), Anlegen/Bearbeiten im Dialog, Ehemalige separat.
 */
export function MitarbeiterSeite() {
  const { data: alle, error, isPending, refetch } = useAlleMitarbeiter()
  const [dialog, setDialog] = useState<Dialog>(null)
  const darfAendern = useDarfAendern()

  if (isPending) {
    return <p className="gedaempft">Lade Mitarbeiter …</p>
  }
  if (error) {
    return (
      <>
        <h1>Mitarbeiter</h1>
        <p className={styles.fehler}>Mitarbeiter konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  const aktive = alle.filter((m) => m.aktiv)
  const ehemalige = alle.filter((m) => !m.aktiv)

  return (
    <>
      <div className={styles.kopf}>
        <div>
          <h1>Mitarbeiter</h1>
          <p className="gedaempft">Die Reihenfolge gilt überall – Pinnwand-Spalten, Auswahllisten, Kalender.</p>
        </div>
        {darfAendern && (
          <Button variante="primaer" icon={Plus} onClick={() => setDialog({ art: 'neu' })}>
            Neuer Mitarbeiter
          </Button>
        )}
      </div>

      {aktive.length === 0 ? (
        <p className={styles.leer}>Noch niemand erfasst. Mit «Neuer Mitarbeiter» die erste Person anlegen.</p>
      ) : (
        <AktiveListe aktive={aktive} darfAendern={darfAendern} onBearbeiten={(mitarbeiter) => setDialog({ art: 'bearbeiten', mitarbeiter })} />
      )}

      {ehemalige.length > 0 && <Ehemalige ehemalige={ehemalige} darfAendern={darfAendern} />}

      {dialog && (
        <MitarbeiterDialog
          key={dialog.art === 'neu' ? 'neu' : dialog.mitarbeiter.id}
          mitarbeiter={dialog.art === 'bearbeiten' ? dialog.mitarbeiter : undefined}
          alle={alle}
          onSchliessen={() => setDialog(null)}
        />
      )}
    </>
  )
}

function AktiveListe({ aktive, darfAendern, onBearbeiten }: {
  aktive: Mitarbeiter[]
  /** Nein bei «nur ansehen»: Tabelle ohne Knöpfe */
  darfAendern: boolean
  onBearbeiten: (m: Mitarbeiter) => void
}) {
  const reihenfolge = useMitarbeiterReihenfolge()
  const toast = useToast()

  function verschieben(index: number, richtung: -1 | 1) {
    const ids = aktive.map((m) => m.id)
    ;[ids[index], ids[index + richtung]] = [ids[index + richtung], ids[index]]
    reihenfolge.mutate(ids, {
      onError: (fehler) => toast.fehler(`Reihenfolge nicht gespeichert: ${fehler.message}`),
    })
  }

  return (
    <div className={styles.tabellenRahmen}>
      <table className={styles.tabelle}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Rolle</th>
            <th>Geburtstag</th>
            <th>Ferien</th>
            <th>Erscheint bei</th>
            {darfAendern && (
              <th>
                <span className={styles.nurScreenreader}>Aktionen</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {aktive.map((m, index) => (
            <tr key={m.id}>
              <td>
                <Namensschild name={m.name} farbe={m.farbe} />
              </td>
              <td>{ROLLEN[m.rolle]}</td>
              <td>{m.geburtstag ? formatDatum(m.geburtstag) : <span className="gedaempft">–</span>}</td>
              <td>{m.ferienanspruch} Tage</td>
              <td>
                <ErscheintBei mitarbeiter={m} />
              </td>
              {darfAendern && (
                <td className={styles.aktionen}>
                  <Button
                    variante="ghost"
                    icon={ArrowUp}
                    aria-label={`${m.name} nach oben`}
                    title="Nach oben"
                    disabled={index === 0 || reihenfolge.isPending}
                    onClick={() => verschieben(index, -1)}
                  />
                  <Button
                    variante="ghost"
                    icon={ArrowDown}
                    aria-label={`${m.name} nach unten`}
                    title="Nach unten"
                    disabled={index === aktive.length - 1 || reihenfolge.isPending}
                    onClick={() => verschieben(index, 1)}
                  />
                  <Button icon={Pencil} onClick={() => onBearbeiten(m)} aria-label={`${m.name} bearbeiten`}>
                    Bearbeiten
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ErscheintBei({ mitarbeiter }: { mitarbeiter: Mitarbeiter }) {
  const bereiche = [
    mitarbeiter.alsMechanikerWaehlbar && 'Termine',
    mitarbeiter.fuerAufgabenWaehlbar && 'To-dos & Notizen',
    mitarbeiter.pinnwandSpalte && 'Pinnwand',
  ].filter(Boolean)

  if (bereiche.length === 0) {
    return <span className="gedaempft">nirgends</span>
  }
  return (
    <ul className={styles.chips}>
      {bereiche.map((bereich) => (
        <li key={String(bereich)} className={styles.chip}>
          {bereich}
        </li>
      ))}
    </ul>
  )
}

/** Personen, die nicht mehr im Betrieb sind – zugeklappt, weil selten gebraucht. */
function Ehemalige({ ehemalige, darfAendern }: { ehemalige: Mitarbeiter[]; darfAendern: boolean }) {
  const aktivSetzen = useMitarbeiterAktivSetzen()
  const toast = useToast()

  function aktivieren(m: Mitarbeiter) {
    aktivSetzen.mutate(
      { id: m.id, aktiv: true },
      {
        onSuccess: () => toast.erfolg(`${m.name} ist wieder aktiv`),
        // z. B. Name inzwischen an eine andere aktive Person vergeben
        onError: (fehler) => toast.fehler(`${m.name} konnte nicht aktiviert werden: ${fehler.message}`),
      },
    )
  }

  return (
    <details className={styles.ehemalige}>
      <summary>Ehemalige ({ehemalige.length})</summary>
      <ul className={styles.ehemaligeListe}>
        {ehemalige.map((m) => (
          <li key={m.id}>
            <Namensschild name={m.name} farbe={m.farbe} />
            <span className="gedaempft">{ROLLEN[m.rolle]}</span>
            {darfAendern && (
              <Button klein icon={RotateCcw} onClick={() => aktivieren(m)} disabled={aktivSetzen.isPending}>
                Wieder aktivieren
              </Button>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
