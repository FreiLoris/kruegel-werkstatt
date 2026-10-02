import { Car, Pencil, Plus, Settings, Trash2, Upload, Users } from 'lucide-react'
import { useState } from 'react'
import { useBestaetigung } from '../../components/ui/bestaetigungKontext'
import { Button } from '../../components/ui/Button'
import { Auswahl, Checkbox, Textbereich, Textfeld } from '../../components/ui/Felder'
import { Menue, MenueEintrag } from '../../components/ui/Menue'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastKontext'
import styles from './KomponentenSeite.module.css'

/**
 * Übersicht aller UI-Grundbausteine – zum Ansehen, Ausprobieren und als Nachschlagewerk
 * ("wie benutze ich das Modal?"). Nur über die System-Seite erreichbar.
 */
export function KomponentenSeite() {
  const toast = useToast()
  const bestaetige = useBestaetigung()
  const [modalOffen, setModalOffen] = useState(false)
  const [laedt, setLaedt] = useState(false)

  async function loeschenTesten() {
    const ok = await bestaetige({
      titel: 'Auftrag löschen?',
      text: 'Der Auftrag A-2026-420 wird endgültig gelöscht.',
      bestaetigenText: 'Löschen',
      gefaehrlich: true,
    })
    if (ok) toast.erfolg('Gelöscht (nur Demo)')
    else toast.info('Abgebrochen')
  }

  function speichernTesten() {
    setLaedt(true)
    setTimeout(() => {
      setLaedt(false)
      toast.erfolg('Gespeichert')
    }, 1500)
  }

  return (
    <>
      <h1>Komponenten</h1>
      <p className="gedaempft">Alle UI-Bausteine der App auf einen Blick.</p>

      <section className={styles.abschnitt}>
        <h2>Buttons</h2>
        <div className={styles.reihe}>
          <Button variante="primaer" icon={Plus}>Neuer Termin</Button>
          <Button icon={Pencil}>Bearbeiten</Button>
          <Button variante="gefahr" icon={Trash2}>Löschen</Button>
          <Button variante="ghost">Abbrechen</Button>
          <Button variante="primaer" laedt={laedt} onClick={speichernTesten}>Speichern (lädt 1,5 s)</Button>
          <Button disabled>Deaktiviert</Button>
          <Button klein icon={Plus}>Klein</Button>
        </div>
      </section>

      <section className={styles.abschnitt}>
        <h2>Eingabefelder</h2>
        <div className={styles.raster}>
          <Textfeld label="Vorname" placeholder="z. B. Hans" pflicht />
          <Textfeld label="Kennzeichen" placeholder="z. B. ZH 123456" hinweis="Mit Kantonskürzel" />
          <Textfeld label="Nachname" defaultValue="" fehler="darf nicht leer sein" pflicht />
          <Textfeld label="Datum" type="date" defaultValue="2026-10-15" />
          <Auswahl label="Mechaniker" defaultValue="">
            <option value="" disabled>– bitte wählen –</option>
            <option>Reto</option>
            <option>Erich</option>
          </Auswahl>
          <Textbereich label="Auszuführende Arbeiten" placeholder="z. B. Ölwechsel, Bremsen vorne" />
        </div>
        <div className={styles.reihe}>
          <Checkbox label="Wartekunde" />
          <Checkbox label="Radwechsel" defaultChecked />
        </div>
      </section>

      <section className={styles.abschnitt}>
        <h2>Rückmeldungen</h2>
        <div className={styles.reihe}>
          <Button onClick={() => toast.erfolg('Mitarbeiter gespeichert')}>Toast: Erfolg</Button>
          <Button onClick={() => toast.info('Neue Daten vom Server')}>Toast: Info</Button>
          <Button onClick={() => toast.fehler('Speichern fehlgeschlagen: Server nicht erreichbar')}>Toast: Fehler</Button>
          <Button variante="gefahr" onClick={loeschenTesten}>Bestätigung (Löschen)</Button>
        </div>
      </section>

      <section className={styles.abschnitt}>
        <h2>Modal & Menü</h2>
        <div className={styles.reihe}>
          <Button onClick={() => setModalOffen(true)}>Modal öffnen</Button>
          <Menue label="Einstellungen" icon={Settings}>
            <MenueEintrag icon={Upload} onClick={() => toast.info('SwissGarage Import')}>SwissGarage Import</MenueEintrag>
            <MenueEintrag icon={Users} onClick={() => toast.info('Mitarbeiter')}>Mitarbeiter</MenueEintrag>
            <MenueEintrag icon={Car} onClick={() => toast.info('Ersatzwagen')}>Ersatzwagen</MenueEintrag>
          </Menue>
        </div>
      </section>

      <Modal
        offen={modalOffen}
        onSchliessen={() => setModalOffen(false)}
        titel="Termin bearbeiten"
        fuss={
          <>
            <Button onClick={() => setModalOffen(false)}>Abbrechen</Button>
            <Button variante="primaer" onClick={() => setModalOffen(false)}>Speichern</Button>
          </>
        }
      >
        <p>
          <Button klein onClick={() => toast.fehler('Speichern fehlgeschlagen – Meldung liegt über dem Modal')}>
            Fehler-Meldung im Modal testen
          </Button>
        </p>
        <div className={styles.raster}>
          {Array.from({ length: 10 }, (_, i) => (
            <Textfeld key={i} label={`Feld ${i + 1}`} placeholder="Langer Inhalt – Kopf und Fuss bleiben fix" />
          ))}
        </div>
      </Modal>
    </>
  )
}
