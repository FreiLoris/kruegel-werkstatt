import { ArrowLeft, ClipboardList, MessageSquarePlus, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useCanEdit, useMyEmployeeId } from '../../app/person/useDevicePerson'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Select, TextArea, TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { useClock } from '../../lib/clock'
import { formatDate, formatTimestamp } from '../../lib/format'
import { useSingleFlight } from '../../lib/useSingleFlight'
import { useActiveEmployees, useAllEmployees } from '../employees/employeeApi'
import { MaterialTabs } from '../stock/MaterialTabs'
import { useStockItems } from '../stock/stockApi'
import { useSuppliers } from '../suppliers/supplierApi'
import {
  isClosed,
  SHOPPING_STATUS,
  useAddShoppingNote,
  useSaveShoppingItem,
  useShoppingEntries,
  useShoppingItem,
  type ShoppingItem,
  type ShoppingStatus,
} from './shoppingApi'
import { detailFormFromItem, shoppingErrors, toShoppingDetailRequest, type ShoppingDetailForm } from './shoppingForm'
import { taskLabel } from './shoppingText'
import { nextDeadline } from '../suppliers/supplierDeliveries'
import styles from './Shopping.module.css'

/**
 * A position of the shopping list with everything about the part (FB-20): the six fields, article,
 * supplier, ordered and expected – and its history: notes ("Lieferant angerufen, erst ab Mi") and
 * who set which state when. Opened from the list and from the task (FB-19).
 */
export function ShoppingItemPage() {
  const { id } = useParams()
  const item = useShoppingItem(id)

  return (
    <>
      <MaterialTabs />
      <p>
        <Link to="/shopping" className={styles.back}>
          <ArrowLeft aria-hidden /> Zur Einkaufsliste
        </Link>
      </p>
      {item.error ? (
        <p className="muted">Position konnte nicht geladen werden: {item.error.message}</p>
      ) : !item.data ? (
        <p className="muted">Lade …</p>
      ) : (
        // the form keeps the version it was opened with: someone else saved meanwhile = 409, nothing overwritten
        <Position key={item.data.id} item={item.data} />
      )}
    </>
  )
}

function Position({ item }: { item: ShoppingItem }) {
  const canEdit = useCanEdit()
  const me = useMyEmployeeId()
  const { data: everyone } = useAllEmployees()
  const recorder = everyone?.find((e) => e.id === item.recordedById)

  return (
    <>
      <h1 className={styles.title}>{item.description}</h1>
      <p className={styles.meta}>
        Erfasst {recorder ? `von ${recorder.name} ` : ''}am {formatTimestamp(item.createdAt)}
        {item.task && (
          <Link to={`/tasks/${item.task.id}`} className={styles.task}>
            <ClipboardList aria-hidden /> {taskLabel(item.task)}
          </Link>
        )}
      </p>
      <div className={styles.columns}>
        <section className={styles.card} aria-labelledby="position-title">
          <h2 id="position-title">Position</h2>
          <DetailForm item={item} canEdit={canEdit} me={me} />
        </section>
        <section className={styles.card} aria-labelledby="history-title">
          <h2 id="history-title">Notizen und Verlauf</h2>
          <History item={item} canEdit={canEdit} />
        </section>
      </div>
    </>
  )
}

function DetailForm({ item, canEdit, me }: { item: ShoppingItem; canEdit: boolean; me: string | undefined }) {
  const { data: active } = useActiveEmployees()
  const { data: everyone } = useAllEmployees()
  const { data: stock = [] } = useStockItems()
  const { data: suppliers = [] } = useSuppliers()
  const { today, time } = useClock()
  const save = useSaveShoppingItem()
  const toast = useToast()
  const once = useSingleFlight()
  const [form, setForm] = useState<ShoppingDetailForm>(() => detailFormFromItem(item, me))
  // a short note with a change of state, e.g. "Offerte per Mail angefragt" (FB-28)
  const [statusNote, setStatusNote] = useState('')
  const statusChanged = form.status !== item.status
  const [showErrors, setShowErrors] = useState(false)
  const errors = shoppingErrors(form)
  const set = <K extends keyof ShoppingDetailForm>(field: K, value: ShoppingDetailForm[K]) => setForm({ ...form, [field]: value })

  const withCurrent = (list: NonNullable<typeof active>, id: string) => {
    const current = everyone?.find((e) => e.id === id)
    return current && !list.some((p) => p.id === id) ? [current, ...list] : list
  }
  const recorders = withCurrent(active ?? [], form.recordedById)
  const orderers = withCurrent((active ?? []).filter((e) => e.selectableForTodos), form.orderById)
  const mainSupplier = (stockItemId: string) => stock.find((i) => i.id === stockItemId)?.suppliers[0]?.supplierId ?? ''

  /** An article of the stock list brings its main supplier (FB-09) – unless one was chosen by hand */
  function chooseArticle(stockItemId: string) {
    const supplierFollows = form.supplierId === '' || form.supplierId === mainSupplier(form.stockItemId)
    setForm({ ...form, stockItemId, supplierId: supplierFollows ? mainSupplier(stockItemId) : form.supplierId })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setShowErrors(true)
    if (Object.keys(errors).length > 0) return
    once((done) =>
      save.mutate(
        // the note goes with the change of state – saved together or not at all
        { id: item.id, request: { ...toShoppingDetailRequest(form, item), statusNote: statusChanged ? statusNote.trim() || null : null } },
        {
          onSuccess: () => {
            toast.success('Position gespeichert')
            setStatusNote('')
          },
          onError: (error) => toast.error(`Nicht gespeichert: ${reasonOf(error)}`),
          onSettled: done,
        },
      ),
    )
  }

  const error = (field: keyof typeof errors) => (showErrors ? errors[field] : undefined)
  return (
    <form onSubmit={submit} className={styles.detailForm}>
      <fieldset disabled={!canEdit} className={styles.fieldset}>
        <TextField label="Bezeichnung" maxLength={500} value={form.description} onChange={(e) => set('description', e.target.value)} error={error('description')} />
        <div className={styles.row}>
          <TextField label="Nummer" maxLength={60} value={form.partNumber} onChange={(e) => set('partNumber', e.target.value)} />
          <TextField label="Anzahl" inputMode="numeric" maxLength={4} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} error={error('quantity')} />
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value as ShoppingStatus)}>
            {Object.entries(SHOPPING_STATUS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {statusChanged && (
          <TextField
            label="Notiz zum Statuswechsel (optional)"
            placeholder="z. B. Offerte per Mail angefragt"
            maxLength={1000}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
          />
        )}
        <div className={styles.row}>
          <Select label="Erfasst von" value={form.recordedById} onChange={(e) => set('recordedById', e.target.value)} error={error('recordedById')}>
            <option value="" disabled>
              Bitte wählen …
            </option>
            {recorders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select label="Bestellen durch" value={form.orderById} onChange={(e) => set('orderById', e.target.value)}>
            <option value="">nicht zugewiesen</option>
            {orderers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className={styles.row}>
          <Select label="Artikel aus dem Lager" value={form.stockItemId} onChange={(e) => chooseArticle(e.target.value)}>
            <option value="">–</option>
            {stock.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
          <Select
            label="Lieferant"
            value={form.supplierId}
            onChange={(e) => set('supplierId', e.target.value)}
            // FB-30: which delivery can still be reached today – while it is still to be ordered
            hint={
              item.status === 'ORDERED' || isClosed(item.status)
                ? undefined
                : (nextDeadline(suppliers.find((s) => s.id === form.supplierId)?.deliveries ?? [], today, time) ?? undefined)
            }
          >
            <option value="">–</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        {/* FB-31: wrong or broken – back to the supplier, with this part on the label */}
        {item.supplierId && (
          <p>
            <Link to={`/suppliers/${item.supplierId}/return-label?item=${item.id}`}>Rücksende-Etikett drucken</Link>
          </p>
        )}
        <div className={styles.row}>
          <TextField label="Bestellt am" type="date" value={form.orderedOn} onChange={(e) => set('orderedOn', e.target.value)} />
          <TextField label="Lieferung erwartet" type="date" value={form.expectedOn} onChange={(e) => set('expectedOn', e.target.value)} />
        </div>
        {item.arrivedOn && <p className="muted">Geliefert am {formatDate(item.arrivedOn)}</p>}
      </fieldset>
      {canEdit && (
        <div className={styles.entryActions}>
          <Button type="submit" variant="primary" icon={Save} loading={save.isPending}>
            Speichern
          </Button>
        </div>
      )}
    </form>
  )
}

/** Notes and changes of state, newest first – who and when at each */
function History({ item, canEdit }: { item: ShoppingItem; canEdit: boolean }) {
  const entries = useShoppingEntries(item.id)
  const { data: everyone } = useAllEmployees()
  const addNote = useAddShoppingNote()
  const toast = useToast()
  const [text, setText] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    addNote.mutate(
      { id: item.id, text: text.trim() },
      { onSuccess: () => setText(''), onError: (error) => toast.error(`Notiz nicht gespeichert: ${reasonOf(error)}`) },
    )
  }

  const name = (id: string | null) => everyone?.find((e) => e.id === id)?.name
  return (
    <>
      {canEdit && (
        <form onSubmit={submit} className={styles.noteForm}>
          <TextArea
            label="Neue Notiz"
            placeholder="z. B. Lieferant angerufen, erst ab Mittwoch lieferbar"
            rows={2}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" icon={MessageSquarePlus} loading={addNote.isPending} disabled={!text.trim()}>
            Notiz hinzufügen
          </Button>
        </form>
      )}
      {entries.error ? (
        <p className="muted">Verlauf konnte nicht geladen werden: {entries.error.message}</p>
      ) : !entries.data ? (
        <p className="muted">Lade …</p>
      ) : entries.data.length === 0 ? (
        <p className="muted">Noch keine Notizen.</p>
      ) : (
        <ol className={styles.history}>
          {[...entries.data].reverse().map((entry) => (
            <li key={entry.id} className={entry.kind === 'STATUS' ? styles.statusEntry : undefined}>
              <span className={styles.when}>
                {formatTimestamp(entry.at)}
                {name(entry.by) && ` · ${name(entry.by)}`}
              </span>
              <span>{entry.kind === 'NOTE' ? entry.text : `Status: ${SHOPPING_STATUS[entry.status!]}`}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
