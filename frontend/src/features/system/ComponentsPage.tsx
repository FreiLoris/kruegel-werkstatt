import { Car, Pencil, Plus, Settings, Trash2, Upload, Users } from 'lucide-react'
import { useState } from 'react'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { LicensePlateField } from '../../components/licenseplate/LicensePlateField'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Checkbox, Select, TextArea, TextField } from '../../components/ui/Fields'
import { Menu, MenuItem } from '../../components/ui/Menu'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import styles from './ComponentsPage.module.css'

/**
 * Overview of all basic UI components – to look at, try out and as a reference
 * ("how do I use the modal?"). Only reachable via the system page.
 */
export function ComponentsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plate, setPlate] = useState('SG 197052')

  async function tryDelete() {
    const ok = await confirm({
      title: 'Auftrag löschen?',
      text: 'Der Auftrag A-2026-420 wird endgültig gelöscht.',
      confirmLabel: 'Löschen',
      dangerous: true,
    })
    if (ok) toast.success('Gelöscht (nur Demo)')
    else toast.info('Abgebrochen')
  }

  function trySave() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Gespeichert')
    }, 1500)
  }

  return (
    <>
      <h1>Komponenten</h1>
      <p className="muted">Alle UI-Bausteine der App auf einen Blick.</p>

      <section className={styles.section}>
        <h2>Buttons</h2>
        <div className={styles.row}>
          <Button variant="primary" icon={Plus}>Neuer Termin</Button>
          <Button icon={Pencil}>Bearbeiten</Button>
          <Button variant="danger" icon={Trash2}>Löschen</Button>
          <Button variant="ghost">Abbrechen</Button>
          <Button variant="primary" loading={loading} onClick={trySave}>Speichern (lädt 1,5 s)</Button>
          <Button disabled>Deaktiviert</Button>
          <Button small icon={Plus}>Klein</Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Eingabefelder</h2>
        <div className={styles.grid}>
          <TextField label="Vorname" placeholder="z. B. Hans" required />
          <TextField label="Kennzeichen" placeholder="z. B. ZH 123456" hint="Mit Kantonskürzel" />
          <TextField label="Nachname" defaultValue="" error="darf nicht leer sein" required />
          <TextField label="Datum" type="date" defaultValue="2026-10-15" />
          <Select label="Mechaniker" defaultValue="">
            <option value="" disabled>– bitte wählen –</option>
            <option>Reto</option>
            <option>Erich</option>
          </Select>
          <TextArea label="Auszuführende Arbeiten" placeholder="z. B. Ölwechsel, Bremsen vorne" />
        </div>
        <div className={styles.row}>
          <Checkbox label="Wartekunde" />
          <Checkbox label="Radwechsel" defaultChecked />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Kennzeichen</h2>
        <div className={styles.row}>
          <LicensePlate text="SG 197052" size="lg" />
          <LicensePlate text="ZH 123456" />
          <LicensePlate text="GR 12345" size="sm" />
          <LicensePlate text="D M AB 1234" />
        </div>
        <div className={styles.plateField}>
          <LicensePlateField value={plate} onChange={setPlate} />
        </div>
        <p className="muted">Gespeichert wird: {plate ? `«${plate}»` : '(nichts)'}</p>
      </section>

      <section className={styles.section}>
        <h2>Rückmeldungen</h2>
        <div className={styles.row}>
          <Button onClick={() => toast.success('Mitarbeiter gespeichert')}>Toast: Erfolg</Button>
          <Button onClick={() => toast.info('Neue Daten vom Server')}>Toast: Info</Button>
          <Button onClick={() => toast.error('Speichern fehlgeschlagen: Server nicht erreichbar')}>Toast: Fehler</Button>
          <Button variant="danger" onClick={tryDelete}>Bestätigung (Löschen)</Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Modal & Menü</h2>
        <div className={styles.row}>
          <Button onClick={() => setModalOpen(true)}>Modal öffnen</Button>
          <Menu label="Einstellungen" icon={Settings}>
            <MenuItem icon={Upload} onClick={() => toast.info('SwissGarage Import')}>SwissGarage Import</MenuItem>
            <MenuItem icon={Users} onClick={() => toast.info('Mitarbeiter')}>Mitarbeiter</MenuItem>
            <MenuItem icon={Car} onClick={() => toast.info('Ersatzwagen')}>Ersatzwagen</MenuItem>
          </Menu>
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Termin bearbeiten"
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>Speichern</Button>
          </>
        }
      >
        <p>
          <Button small onClick={() => toast.error('Speichern fehlgeschlagen – Meldung liegt über dem Modal')}>
            Fehler-Meldung im Modal testen
          </Button>
        </p>
        <div className={styles.grid}>
          {Array.from({ length: 10 }, (_, i) => (
            <TextField key={i} label={`Feld ${i + 1}`} placeholder="Langer Inhalt – Kopf und Fuss bleiben fix" />
          ))}
        </div>
      </Modal>
    </>
  )
}
