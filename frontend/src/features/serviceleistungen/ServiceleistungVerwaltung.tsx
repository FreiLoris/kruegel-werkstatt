import { useState } from 'react'
import { useDarfAendern } from '../../app/person/useGeraetPerson'
import { NameDialog } from '../../components/stammdaten/NameDialog'
import { Stammdatenliste } from '../../components/stammdaten/Stammdatenliste'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastKontext'
import {
  useAlleServiceleistungen,
  useServiceleistungAktivSetzen,
  useServiceleistungReihenfolge,
  useServiceleistungSpeichern,
  type Serviceleistung,
} from './serviceleistungApi'

type Dialog = { art: 'neu' } | { art: 'umbenennen'; leistung: Serviceleistung } | null

/**
 * Serviceleistungen verwalten (Ölwechsel, Wischblätter, …) – früher 8 feste Checkboxen.
 * Darstellung: {@link Stammdatenliste}.
 */
export function ServiceleistungVerwaltung() {
  const { data: alle, error, isPending, refetch } = useAlleServiceleistungen()
  const darfAendern = useDarfAendern()
  const speichern = useServiceleistungSpeichern()
  const reihenfolge = useServiceleistungReihenfolge()
  const aktivSetzen = useServiceleistungAktivSetzen()
  const toast = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) return <p className="gedaempft">Lade Serviceleistungen …</p>
  if (error) {
    return (
      <>
        <p className="gedaempft">Serviceleistungen konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  // Ohne Rückfrage: harmlos und mit einem Klick unter «Nicht mehr angeboten» rückgängig zu machen
  function aktivSetzenMitMeldung(leistung: Serviceleistung, aktiv: boolean) {
    aktivSetzen.mutate(
      { id: leistung.id, aktiv },
      {
        onSuccess: () => toast.erfolg(aktiv ? `${leistung.name} wird wieder angeboten` : `${leistung.name} wird nicht mehr angeboten`),
        onError: (fehler) => toast.fehler(`${leistung.name}: ${fehler.message}`),
      },
    )
  }

  return (
    <>
      <Stammdatenliste
        eintraege={alle}
        texte={{
          titel: 'Serviceleistungen',
          beschreibung: 'Zum Ankreuzen beim Service. Reihenfolge = Reihenfolge im Auftrag und auf dem Auftragszettel.',
          neu: 'Leistung hinzufügen',
          deaktivieren: 'Nicht mehr anbieten',
          inaktiv: 'Nicht mehr angeboten',
          aktivieren: 'Wieder anbieten',
        }}
        darfAendern={darfAendern}
        beschaeftigt={reihenfolge.isPending || aktivSetzen.isPending}
        onNeu={() => setDialog({ art: 'neu' })}
        onUmbenennen={(leistung) => setDialog({ art: 'umbenennen', leistung })}
        onDeaktivieren={(leistung) => aktivSetzenMitMeldung(leistung, false)}
        onAktivieren={(leistung) => aktivSetzenMitMeldung(leistung, true)}
        onReihenfolge={(ids) =>
          reihenfolge.mutate(ids, { onError: (fehler) => toast.fehler(`Reihenfolge nicht gespeichert: ${fehler.message}`) })
        }
      />

      {dialog && (
        <NameDialog
          key={dialog.art === 'neu' ? 'neu' : dialog.leistung.id}
          titel={dialog.art === 'neu' ? 'Neue Serviceleistung' : `${dialog.leistung.name} umbenennen`}
          startName={dialog.art === 'umbenennen' ? dialog.leistung.name : undefined}
          placeholder="z. B. Reifen einlagern"
          hinweis="So erscheint die Leistung als Checkbox im Auftrag."
          maxLength={40}
          speichern={(name) =>
            speichern.mutateAsync(
              dialog.art === 'neu' ? { name } : { id: dialog.leistung.id, name, version: dialog.leistung.version },
            )
          }
          onSchliessen={() => setDialog(null)}
        />
      )}
    </>
  )
}
