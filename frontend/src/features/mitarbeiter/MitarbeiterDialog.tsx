import { UserX } from 'lucide-react'
import { useId, useState } from 'react'
import { ApiFehler } from '../../api/fehler'
import { useBestaetigung } from '../../components/ui/bestaetigungKontext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastKontext'
import styles from './MitarbeiterDialog.module.css'
import { alsEingabe, startwerte } from './formularwerte'
import { MitarbeiterFormular } from './MitarbeiterFormular'
import { useMitarbeiterAktivSetzen, useMitarbeiterSpeichern, type Mitarbeiter } from './mitarbeiterApi'

interface MitarbeiterDialogProps {
  /** Leer = neue Person anlegen */
  mitarbeiter?: Mitarbeiter
  /** Alle Personen – für die Anzeige, welche Farben schon vergeben sind */
  alle: Mitarbeiter[]
  onSchliessen: () => void
}

/**
 * Anlegen und Bearbeiten in einem Dialog.
 *
 * Wird beim Öffnen neu eingesetzt (siehe `key` in der Seite) – so startet das Formular
 * immer mit den aktuellen Werten und es bleibt nichts vom letzten Mal stehen.
 */
export function MitarbeiterDialog({ mitarbeiter, alle, onSchliessen }: MitarbeiterDialogProps) {
  const formularId = useId()
  const toast = useToast()
  const bestaetige = useBestaetigung()
  const speichern = useMitarbeiterSpeichern()
  const aktivSetzen = useMitarbeiterAktivSetzen()

  const andere = alle.filter((m) => m.aktiv && m.id !== mitarbeiter?.id)
  const farbenVergeben = new Map(andere.map((m) => [m.farbe.toLowerCase(), m.name]))
  const [werte, setWerte] = useState(() => startwerte(mitarbeiter, [...farbenVergeben.keys()]))

  function aendern(neueWerte: typeof werte) {
    setWerte(neueWerte)
    // Alte Fehlermeldung verschwindet, sobald korrigiert wird
    if (speichern.error) speichern.reset()
  }

  function absenden() {
    speichern.mutate(
      { id: mitarbeiter?.id, eingabe: alsEingabe(werte, mitarbeiter?.version) },
      {
        onSuccess: (gespeichert) => {
          toast.erfolg(`${gespeichert.name} gespeichert`)
          onSchliessen()
        },
        onError: (fehler) => {
          if (fehler instanceof ApiFehler && fehler.istKonflikt) {
            toast.fehler(`${mitarbeiter?.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onSchliessen()
          } else if (!istFeldfehler(fehler)) {
            // Feldfehler stehen direkt beim Feld – alles andere (Server weg, 500) als Meldung
            toast.fehler(`Speichern fehlgeschlagen: ${fehler.message}`)
          }
        },
      },
    )
  }

  async function deaktivieren() {
    if (!mitarbeiter) return
    const ok = await bestaetige({
      titel: `${mitarbeiter.name} deaktivieren?`,
      text:
        `${mitarbeiter.name} erscheint danach in keiner Auswahl und auf keiner Pinnwand mehr. ` +
        'Bisherige Aufträge und Einträge behalten den Namen. Unter «Ehemalige» lässt sich das jederzeit rückgängig machen.',
      bestaetigenText: 'Deaktivieren',
    })
    if (!ok) return
    aktivSetzen.mutate(
      { id: mitarbeiter.id, aktiv: false },
      {
        onSuccess: () => {
          toast.erfolg(`${mitarbeiter.name} deaktiviert`)
          onSchliessen()
        },
        onError: (fehler) => toast.fehler(`Deaktivieren fehlgeschlagen: ${fehler.message}`),
      },
    )
  }

  return (
    <Modal
      offen
      onSchliessen={onSchliessen}
      titel={mitarbeiter ? `${mitarbeiter.name} bearbeiten` : 'Neuer Mitarbeiter'}
      fuss={
        <>
          {mitarbeiter?.aktiv && (
            <Button variante="ghost" icon={UserX} onClick={deaktivieren} laedt={aktivSetzen.isPending} className={styles.links}>
              Deaktivieren
            </Button>
          )}
          <Button onClick={onSchliessen}>Abbrechen</Button>
          <Button variante="primaer" type="submit" form={formularId} laedt={speichern.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <MitarbeiterFormular
        id={formularId}
        werte={werte}
        onAendern={aendern}
        onAbsenden={absenden}
        fehler={speichern.error}
        farbenVergeben={farbenVergeben}
      />
    </Modal>
  )
}

function istFeldfehler(fehler: Error): boolean {
  return fehler instanceof ApiFehler && (fehler.problem.fehler?.length ?? 0) > 0
}
