import { Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Select, TextArea, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { CATEGORY_LABEL, useDeleteStockItem, useSaveStockItem, type StockCategory, type StockItem, type StockItemRequest } from './stockApi'
import styles from './StockItemDialog.module.css'
import type { StorageLocation } from './storageLocationApi'

/** Form state: all text while typing; empty = not set. */
interface FormValues {
  name: string
  category: StockCategory
  articleNumber: string
  manufacturer: string
  quantity: string
  storageLocationId: string
  remark: string
}

function initialValues(item: StockItem | undefined, defaults: Partial<FormValues>): FormValues {
  return {
    name: item?.name ?? '',
    category: item?.category ?? defaults.category ?? 'SPARE_PART',
    articleNumber: item?.articleNumber ?? '',
    manufacturer: item?.manufacturer ?? '',
    quantity: item?.quantity?.toString() ?? '',
    storageLocationId: item ? (item.storageLocationId ?? '') : (defaults.storageLocationId ?? ''),
    remark: item?.remark ?? '',
  }
}

function toRequest(values: FormValues, version?: number): StockItemRequest {
  return {
    name: values.name.trim(),
    category: values.category,
    articleNumber: values.articleNumber.trim() || undefined,
    manufacturer: values.manufacturer.trim() || undefined,
    quantity: values.quantity === '' ? null : Number(values.quantity),
    storageLocationId: values.storageLocationId || null,
    remark: values.remark.trim() || undefined,
    version,
  }
}

/**
 * Add, edit or delete an article (FB-08). Mounted fresh on every open (`key`). A new article starts
 * with the category and place of the current filter – whoever walks along shelf A adds what lies there.
 */
export function StockItemDialog({
  item,
  locations,
  defaults = {},
  onClose,
}: {
  item?: StockItem
  /** all places, also ones no longer used (an article may still lie there) */
  locations: StorageLocation[]
  defaults?: { category?: StockCategory; storageLocationId?: string }
  onClose: () => void
}) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveStockItem()
  const remove = useDeleteStockItem()
  const [values, setValues] = useState(() => initialValues(item, defaults))

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)
  // places in use, plus the article's own one if it is no longer used
  const choosable = locations.filter((l) => l.active || l.id === item?.storageLocationId)

  function set(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { id: item?.id, request: toRequest(values, item?.version) },
      {
        onSuccess: (saved) => {
          toast.success(`${saved.name} gespeichert`)
          onClose()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isConflict) {
            toast.error(`${item?.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onClose()
          } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
        },
      },
    )
  }

  async function deleteItem() {
    if (!item) return
    const ok = await confirm({
      title: `${item.name} löschen?`,
      text: 'Der Artikel verschwindet aus der Lagerliste. Das lässt sich nicht rückgängig machen.',
      confirmLabel: 'Löschen',
    })
    if (!ok) return
    remove.mutate(item.id, {
      onSuccess: () => {
        toast.success(`${item.name} gelöscht`)
        onClose()
      },
      onError: (error) => toast.error(`${item.name}: ${error.message}`),
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? `${item.name} bearbeiten` : 'Neuer Artikel'}
      footer={
        <>
          {item && (
            <Button variant="ghost" icon={Trash2} onClick={deleteItem} loading={remove.isPending} className={styles.left}>
              Löschen
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
        <TextField
          label="Bezeichnung"
          required
          placeholder="z. B. Ölfilter"
          maxLength={100}
          autoComplete="off"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={fieldError('name')}
        />
        <div className={styles.row}>
          <Select label="Kategorie" required value={values.category} onChange={(e) => set('category', e.target.value)} error={fieldError('category')}>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <TextField
            label="Menge"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            hint="Leer = nicht gezählt"
            value={values.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            error={fieldError('quantity')}
          />
        </div>
        <Select
          label="Lagerort"
          hint={locations.length === 0 ? 'Lagerorte werden in den Einstellungen erfasst.' : undefined}
          value={values.storageLocationId}
          onChange={(e) => set('storageLocationId', e.target.value)}
          error={fieldError('storageLocationId')}
        >
          <option value="">– kein fester Platz –</option>
          {choosable.map((l) => (
            <option key={l.id} value={l.id}>
              {l.active ? l.name : `${l.name} (nicht mehr verwendet)`}
            </option>
          ))}
        </Select>
        <div className={styles.row}>
          <TextField
            label="Artikelnummer"
            maxLength={60}
            autoComplete="off"
            value={values.articleNumber}
            onChange={(e) => set('articleNumber', e.target.value)}
            error={fieldError('articleNumber')}
          />
          <TextField
            label="Hersteller"
            maxLength={60}
            autoComplete="off"
            value={values.manufacturer}
            onChange={(e) => set('manufacturer', e.target.value)}
            error={fieldError('manufacturer')}
          />
        </div>
        <TextArea label="Bemerkung" rows={2} maxLength={1000} value={values.remark} onChange={(e) => set('remark', e.target.value)} error={fieldError('remark')} />
      </form>
    </Modal>
  )
}
