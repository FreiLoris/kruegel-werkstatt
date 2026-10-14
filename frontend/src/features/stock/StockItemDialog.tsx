import { ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Select, TextArea, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import type { Supplier } from '../suppliers/supplierApi'
import { CATEGORY_LABEL, useDeleteStockItem, useSaveStockItem, type StockCategory, type StockItem, type StockItemRequest } from './stockApi'
import { placeTree } from './placeTree'
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
  /** the main supplier first */
  suppliers: { supplierId: string; articleNumber: string }[]
}

type Defaults = { category?: StockCategory; storageLocationId?: string; supplierId?: string }

function initialValues(item: StockItem | undefined, defaults: Defaults): FormValues {
  return {
    name: item?.name ?? '',
    category: item?.category ?? defaults.category ?? 'SPARE_PART',
    articleNumber: item?.articleNumber ?? '',
    manufacturer: item?.manufacturer ?? '',
    quantity: item?.quantity?.toString() ?? '',
    storageLocationId: item ? (item.storageLocationId ?? '') : (defaults.storageLocationId ?? ''),
    remark: item?.remark ?? '',
    suppliers: item
      ? item.suppliers.map((s) => ({ supplierId: s.supplierId, articleNumber: s.articleNumber ?? '' }))
      : defaults.supplierId
        ? [{ supplierId: defaults.supplierId, articleNumber: '' }]
        : [],
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
    suppliers: values.suppliers.map((s) => ({ supplierId: s.supplierId, articleNumber: s.articleNumber.trim() || undefined })),
    version,
  }
}

/**
 * Add, edit or delete an article (FB-08) with its suppliers (FB-09). Mounted fresh on every open
 * (`key`). A new article starts with the category, place and supplier of the current filter – whoever
 * walks along shelf A adds what lies there.
 */
export function StockItemDialog({
  item,
  locations,
  suppliers,
  defaults = {},
  onClose,
}: {
  item?: StockItem
  /** all places, also ones no longer used (an article may still lie there) */
  locations: StorageLocation[]
  suppliers: Supplier[]
  defaults?: Defaults
  onClose: () => void
}) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveStockItem()
  const remove = useDeleteStockItem()
  const [values, setValues] = useState(() => initialValues(item, defaults))

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)
  // places in use in tree order, plus the article's own one if it is no longer used
  const choosable = useMemo(
    () => placeTree(locations).filter((p) => p.location.active || p.location.id === item?.storageLocationId),
    [locations, item?.storageLocationId],
  )

  function set(field: Exclude<keyof FormValues, 'suppliers'>, value: string) {
    change({ ...values, [field]: value })
  }

  function change(next: FormValues) {
    setValues(next)
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
          {choosable.map((p) => (
            <option key={p.location.id} value={p.location.id}>
              {p.location.active ? p.path : `${p.path} (nicht mehr verwendet)`}
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
        <SupplierRows
          rows={values.suppliers}
          suppliers={suppliers}
          error={fieldError('suppliers')}
          onChange={(rows) => change({ ...values, suppliers: rows })}
        />
      </form>
    </Modal>
  )
}

type SupplierRow = FormValues['suppliers'][number]

/**
 * Who sells the article: the first row is the main supplier, further ones optional, each with its own
 * article number (FB-09). "↑" moves a further one up – to the top it becomes the main supplier.
 */
function SupplierRows({
  rows,
  suppliers,
  error,
  onChange,
}: {
  rows: SupplierRow[]
  suppliers: Supplier[]
  error?: string
  onChange: (rows: SupplierRow[]) => void
}) {
  const unused = suppliers.filter((s) => !rows.some((r) => r.supplierId === s.id))
  const name = (id: string) => suppliers.find((s) => s.id === id)?.name ?? ''

  function update(index: number, row: SupplierRow) {
    onChange(rows.map((r, i) => (i === index ? row : r)))
  }

  function moveUp(index: number) {
    const next = [...rows]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  return (
    <fieldset className={styles.suppliers}>
      <legend>Lieferanten</legend>
      {suppliers.length === 0 ? (
        <p className="muted">Lieferanten werden unter Material → Lieferanten erfasst.</p>
      ) : (
        <>
          {rows.map((row, index) => (
            <div key={row.supplierId} className={styles.supplierRow}>
              <Select
                label={index === 0 ? 'Hauptlieferant' : 'Weiterer Lieferant'}
                value={row.supplierId}
                onChange={(e) => update(index, { ...row, supplierId: e.target.value })}
              >
                <option value={row.supplierId}>{name(row.supplierId)}</option>
                {unused.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <TextField
                label="Seine Artikelnummer"
                maxLength={60}
                autoComplete="off"
                value={row.articleNumber}
                onChange={(e) => update(index, { ...row, articleNumber: e.target.value })}
              />
              <div className={styles.supplierActions}>
                {index > 0 && (
                  <Button
                    variant="ghost"
                    icon={ArrowUp}
                    title={index === 1 ? 'Zum Hauptlieferanten machen' : 'Nach oben'}
                    aria-label={`${name(row.supplierId)} ${index === 1 ? 'zum Hauptlieferanten machen' : 'nach oben'}`}
                    onClick={() => moveUp(index)}
                  />
                )}
                <Button
                  variant="ghost"
                  icon={X}
                  title="Entfernen"
                  aria-label={`${name(row.supplierId)} entfernen`}
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                />
              </div>
            </div>
          ))}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {unused.length > 0 && (
            <Button small icon={Plus} onClick={() => onChange([...rows, { supplierId: unused[0].id, articleNumber: '' }])}>
              {rows.length === 0 ? 'Lieferant' : 'Weiterer Lieferant'}
            </Button>
          )}
        </>
      )}
    </fieldset>
  )
}
