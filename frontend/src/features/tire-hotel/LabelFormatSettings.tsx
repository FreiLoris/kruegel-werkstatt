import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError, reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useDeleteLabelFormat, useLabelFormats, useSaveLabelFormat, type LabelFormat } from './tireHotelApi'
import styles from './TireHotel.module.css'

const mm = (value: number) => String(value).replace('.', ',')

/**
 * The A4 label sheets of the tyre hotel (FB-07): the common ones come with the app – a test print
 * shows whether the margins fit this printer; the workshop adds its own from the sheet's data.
 */
export function LabelFormatSettings() {
  const { data: formats, error } = useLabelFormats()
  const canEdit = useCanEdit()
  const confirm = useConfirm()
  const toast = useToast()
  const remove = useDeleteLabelFormat()
  const [dialog, setDialog] = useState<{ format?: LabelFormat } | null>(null)

  async function deleteFormat(format: LabelFormat) {
    if (!(await confirm({ title: `${format.name} löschen?`, text: 'Das Format verschwindet aus der Auswahl beim Etikettendruck.', confirmLabel: 'Löschen', dangerous: true }))) {
      return
    }
    remove.mutate(format.id, {
      onSuccess: () => toast.success(`${format.name} gelöscht`),
      onError: (e) => toast.error(`Nicht gelöscht: ${reasonOf(e)}`),
    })
  }

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2>Pneuhotel – Etiketten</h2>
          <p className="muted">A4-Etikettenbögen für die Reifen-Etiketten. Masse in mm laut Packung – einmal mit einem Probedruck prüfen.</p>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={() => setDialog({})}>
            Format hinzufügen
          </Button>
        )}
      </div>
      {error ? (
        <p className="muted">Formate konnten nicht geladen werden: {error.message}</p>
      ) : !formats ? (
        <p className="muted">Lade …</p>
      ) : formats.length === 0 ? (
        <p className={styles.empty}>Noch keine Formate.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Bogen</th>
                <th>Etiketten</th>
                <th>Grösse</th>
                {canEdit && <th aria-label="Aktionen" />}
              </tr>
            </thead>
            <tbody>
              {formats.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td className={styles.nowrap}>
                    {f.columns} × {f.rows} = {f.columns * f.rows}
                  </td>
                  <td className={styles.nowrap}>
                    {mm(f.widthMm)} × {mm(f.heightMm)} mm
                  </td>
                  {canEdit && (
                    <td className={styles.nowrap}>
                      <Button small icon={Pencil} onClick={() => setDialog({ format: f })} aria-label={`${f.name} bearbeiten`}>
                        Bearbeiten
                      </Button>{' '}
                      <Button small variant="ghost" icon={Trash2} onClick={() => deleteFormat(f)} aria-label={`${f.name} löschen`} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && <FormatDialog key={dialog.format?.id ?? 'new'} format={dialog.format} onClose={() => setDialog(null)} />}
    </>
  )
}

type Field = 'columns' | 'rows' | 'widthMm' | 'heightMm' | 'marginTop' | 'marginLeft' | 'gapX' | 'gapY'

const FIELDS: { field: Field; label: string; hint?: string }[] = [
  { field: 'columns', label: 'Spalten' },
  { field: 'rows', label: 'Reihen' },
  { field: 'widthMm', label: 'Breite (mm)', hint: 'eines Etiketts' },
  { field: 'heightMm', label: 'Höhe (mm)', hint: 'eines Etiketts' },
  { field: 'marginTop', label: 'Rand oben (mm)', hint: 'bis zum ersten Etikett' },
  { field: 'marginLeft', label: 'Rand links (mm)', hint: 'bis zum ersten Etikett' },
  { field: 'gapX', label: 'Abstand waagrecht (mm)', hint: 'zwischen zwei Etiketten' },
  { field: 'gapY', label: 'Abstand senkrecht (mm)', hint: 'zwischen zwei Etiketten' },
]

function FormatDialog({ format, onClose }: { format?: LabelFormat; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const save = useSaveLabelFormat()
  const [name, setName] = useState(format?.name ?? '')
  const [values, setValues] = useState<Record<Field, string>>(() =>
    Object.fromEntries(FIELDS.map(({ field }) => [field, format ? mm(format[field]) : field === 'columns' ? '3' : field === 'rows' ? '8' : '0'])) as Record<Field, string>,
  )
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)
  const number = (field: Field) => Number(values[field].replace(',', '.'))

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      {
        id: format?.id,
        request: {
          name: name.trim(),
          columns: number('columns'),
          rows: number('rows'),
          widthMm: number('widthMm'),
          heightMm: number('heightMm'),
          marginTop: number('marginTop'),
          marginLeft: number('marginLeft'),
          gapX: number('gapX'),
          gapY: number('gapY'),
          version: format?.version,
        },
      },
      {
        onSuccess: (saved) => {
          toast.success(`${saved.name} gespeichert`)
          onClose()
        },
        onError: (error) => {
          if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) toast.error(`Nicht gespeichert: ${reasonOf(error)}`)
        },
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={format ? `${format.name} bearbeiten` : 'Neues Etikettenformat'}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.dialogBody} onSubmit={submit}>
        <TextField
          label="Name"
          required
          placeholder="z. B. Herma 4473 – 24 pro Bogen (70 × 37 mm)"
          maxLength={80}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (save.error) save.reset()
          }}
          error={fieldError('name')}
        />
        <div className={styles.row}>
          {FIELDS.map(({ field, label, hint }) => (
            <TextField
              key={field}
              label={label}
              hint={hint}
              inputMode="decimal"
              required
              value={values[field]}
              onChange={(e) => {
                setValues({ ...values, [field]: e.target.value })
                if (save.error) save.reset()
              }}
              error={fieldError(field)}
            />
          ))}
        </div>
      </form>
    </Modal>
  )
}
