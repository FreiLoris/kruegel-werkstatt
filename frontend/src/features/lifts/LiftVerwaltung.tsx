import { useState } from 'react'
import { useDarfAendern } from '../../app/person/useGeraetPerson'
import { NameDialog } from '../../components/stammdaten/NameDialog'
import { Stammdatenliste } from '../../components/stammdaten/Stammdatenliste'
import { useBestaetigung } from '../../components/ui/bestaetigungKontext'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastKontext'
import { useAlleLifts, useLiftAktivSetzen, useLiftReihenfolge, useLiftSpeichern, type Lift } from './liftApi'

type Dialog = { art: 'neu' } | { art: 'umbenennen'; lift: Lift } | null

/**
 * Lifts verwalten: Anzahl, Namen, Reihenfolge (= Spalten von links nach rechts).
 * Früher fest «Lift 1/2/3» im Code (Bug #13). Darstellung: {@link Stammdatenliste}.
 */
export function LiftVerwaltung() {
  const { data: alle, error, isPending, refetch } = useAlleLifts()
  const darfAendern = useDarfAendern()
  const speichern = useLiftSpeichern()
  const reihenfolge = useLiftReihenfolge()
  const aktivSetzen = useLiftAktivSetzen()
  const toast = useToast()
  const bestaetige = useBestaetigung()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) return <p className="gedaempft">Lade Lifts …</p>
  if (error) {
    return (
      <>
        <p className="gedaempft">Lifts konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
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

  return (
    <>
      <Stammdatenliste
        eintraege={alle}
        texte={{
          titel: 'Lifts',
          beschreibung: 'Reihenfolge von oben nach unten = Spalten von links nach rechts in Tagesansicht und Dashboard.',
          neu: 'Lift hinzufügen',
          deaktivieren: 'Stilllegen',
          inaktiv: 'Stillgelegt',
          aktivieren: 'Wieder in Betrieb',
        }}
        darfAendern={darfAendern}
        beschaeftigt={reihenfolge.isPending || aktivSetzen.isPending}
        mindestensEinerAktiv
        onNeu={() => setDialog({ art: 'neu' })}
        onUmbenennen={(lift) => setDialog({ art: 'umbenennen', lift })}
        onDeaktivieren={(lift) => void stilllegen(lift)}
        onAktivieren={(lift) =>
          aktivSetzen.mutate(
            { id: lift.id, aktiv: true },
            {
              onSuccess: () => toast.erfolg(`${lift.name} ist wieder in Betrieb`),
              onError: (fehler) => toast.fehler(`${lift.name} konnte nicht aktiviert werden: ${fehler.message}`),
            },
          )
        }
        onReihenfolge={(ids) =>
          reihenfolge.mutate(ids, { onError: (fehler) => toast.fehler(`Reihenfolge nicht gespeichert: ${fehler.message}`) })
        }
      />

      {dialog && (
        <NameDialog
          key={dialog.art === 'neu' ? 'neu' : dialog.lift.id}
          titel={dialog.art === 'neu' ? 'Neuer Lift' : `${dialog.lift.name} umbenennen`}
          startName={dialog.art === 'umbenennen' ? dialog.lift.name : undefined}
          placeholder="z. B. Lift 4 oder Grube"
          hinweis="So heisst die Spalte in Tagesansicht und Dashboard."
          maxLength={30}
          speichern={(name) =>
            speichern.mutateAsync(
              dialog.art === 'neu' ? { name } : { id: dialog.lift.id, name, version: dialog.lift.version },
            )
          }
          onSchliessen={() => setDialog(null)}
        />
      )}
    </>
  )
}
