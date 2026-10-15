import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError, reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Select, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import {
  LOCATION_KINDS,
  useDeleteTireLocation,
  useSaveTireLocation,
  useTireLocations,
  type TireLocation,
  type TireLocationKind,
} from './tireHotelApi'
import styles from './TireHotel.module.css'
import { columnLetter } from './tirePlaces'

/** What the three sizes mean, by kind */
const SIZES: Record<TireLocationKind, [string, string, string]> = {
  FLOOR: ['Spalten (A, B, …)', 'Reihen', 'Sätze pro Feld'],
  SHELVES: ['Regale', 'Ebenen', 'Fächer pro Ebene'],
}

/** The first address – what the addresses will look like */
function example(kind: TireLocationKind, code: string): string {
  const c = code.trim().toUpperCase() || 'XX'
  return kind === 'FLOOR' ? `${c}-${columnLetter(1)}1-1` : `${c}-R1-E1-F1`
}

/**
 * The locations of the tyre hotel (FB-07, 13n): set up once – a floor grid or shelves, the places
 * are generated. Not fixed in the code: the workshop has not named its places yet.
 */
export function TireLocationSettings() {
  const { data: locations, error } = useTireLocations()
  const canEdit = useCanEdit()
  const confirm = useConfirm()
  const toast = useToast()
  const remove = useDeleteTireLocation()
  const [dialog, setDialog] = useState<{ location?: TireLocation } | null>(null)

  async function deleteLocation(location: TireLocation) {
    const ok = await confirm({
      title: `${location.code} – ${location.name} löschen?`,
      text: 'Der Standort und seine Plätze werden gelöscht. Geht nur, solange dort kein Satz eingelagert ist.',
      confirmLabel: 'Löschen',
      dangerous: true,
    })
    if (!ok) return
    remove.mutate(location.id, {
      onSuccess: () => toast.success(`${location.name} gelöscht`),
      onError: (e) => toast.error(`Nicht gelöscht: ${reasonOf(e)}`),
    })
  }

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2>Pneuhotel – Standorte</h2>
          <p className="muted">Bodenraster oder Regale – die Plätze werden aus den Grössen erzeugt, z. B. OG-B3-1 oder CT-R1-E2-F4.</p>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={() => setDialog({})}>
            Standort hinzufügen
          </Button>
        )}
      </div>
      {error ? (
        <p className="muted">Standorte konnten nicht geladen werden: {error.message}</p>
      ) : !locations ? (
        <p className="muted">Lade …</p>
      ) : locations.length === 0 ? (
        <p className={styles.empty}>Noch keine Standorte.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kürzel</th>
                <th>Name</th>
                <th>Aufbau</th>
                <th>Plätze</th>
                {canEdit && <th aria-label="Aktionen" />}
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.code}</strong>
                  </td>
                  <td>{l.name}</td>
                  <td>
                    {LOCATION_KINDS[l.kind]}: {l.sizeA} × {l.sizeB} × {l.sizeC}
                  </td>
                  <td>
                    {l.sizeA * l.sizeB * l.sizeC} <span className="muted">(ab {example(l.kind, l.code)})</span>
                  </td>
                  {canEdit && (
                    <td className={styles.nowrap}>
                      <Button small icon={Pencil} onClick={() => setDialog({ location: l })} aria-label={`${l.name} bearbeiten`}>
                        Bearbeiten
                      </Button>{' '}
                      <Button small variant="ghost" icon={Trash2} onClick={() => deleteLocation(l)} aria-label={`${l.name} löschen`} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && <LocationDialog key={dialog.location?.id ?? 'new'} location={dialog.location} onClose={() => setDialog(null)} />}
    </>
  )
}

function LocationDialog({ location, onClose }: { location?: TireLocation; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const save = useSaveTireLocation()
  const [values, setValues] = useState({
    code: location?.code ?? '',
    name: location?.name ?? '',
    kind: location?.kind ?? ('FLOOR' as TireLocationKind),
    sizeA: String(location?.sizeA ?? 6),
    sizeB: String(location?.sizeB ?? 4),
    sizeC: String(location?.sizeC ?? 2),
  })
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)
  const set = (field: keyof typeof values, value: string) => {
    setValues({ ...values, [field]: value })
    if (save.error) save.reset()
  }
  const [labelA, labelB, labelC] = SIZES[values.kind]
  const count = Number(values.sizeA) * Number(values.sizeB) * Number(values.sizeC)

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      {
        id: location?.id,
        request: {
          code: values.code.trim(),
          name: values.name.trim(),
          kind: values.kind,
          sizeA: Number(values.sizeA),
          sizeB: Number(values.sizeB),
          sizeC: Number(values.sizeC),
          version: location?.version,
        },
      },
      {
        onSuccess: (saved) => {
          toast.success(`${saved.code} – ${saved.name} gespeichert`)
          onClose()
        },
        onError: (error) => {
          if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) toast.error(`Nicht gespeichert: ${reasonOf(error)}`)
        },
      },
    )
  }

  const size = (field: 'sizeA' | 'sizeB' | 'sizeC', label: string, max: number) => (
    <TextField
      label={label}
      type="number"
      min={1}
      max={max}
      required
      value={values[field]}
      onChange={(e) => set(field, e.target.value)}
      error={fieldError(field)}
    />
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={location ? `${location.code} bearbeiten` : 'Neuer Standort'}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.section} onSubmit={submit}>
        <div className={styles.row}>
          <TextField
            label="Kürzel"
            required
            placeholder="z. B. OG"
            maxLength={6}
            hint="Anfang jeder Adresse"
            value={values.code}
            onChange={(e) => set('code', e.target.value)}
            error={fieldError('code')}
          />
          <TextField
            label="Name"
            required
            placeholder="z. B. Werkstatt 1. Stock"
            maxLength={60}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            error={fieldError('name')}
          />
        </div>
        <Select
          label="Aufbau"
          value={values.kind}
          disabled={!!location}
          hint={location ? 'Bleibt – sonst bedeuten die Plätze etwas anderes' : undefined}
          onChange={(e) => set('kind', e.target.value)}
        >
          {Object.entries(LOCATION_KINDS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className={styles.row}>
          {size('sizeA', labelA, 26)}
          {size('sizeB', labelB, 30)}
          {size('sizeC', labelC, 30)}
        </div>
        <p className="muted">
          {Number.isFinite(count) && count > 0 ? `${count} Plätze, ab ${example(values.kind, values.code)}.` : ''} Verkleinern geht nur, wo kein Satz
          liegt.
        </p>
      </form>
    </Modal>
  )
}
