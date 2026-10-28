import { Plus, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useMyEmployeeId } from '../../app/person/useDevicePerson'
import { followed, useFollowPerson } from '../../app/person/useFollowPerson'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Select, TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { useSingleFlight } from '../../lib/useSingleFlight'
import { useActiveEmployees, useAllEmployees } from '../employees/employeeApi'
import { SHOPPING_STATUS, useSaveShoppingItem, type ShoppingItem, type ShoppingStatus } from './shoppingApi'
import { emptyShoppingForm, formFromItem, shoppingErrors, toShoppingRequest, type ShoppingForm } from './shoppingForm'
import styles from './Shopping.module.css'

interface ShoppingEntryFormProps {
  /** editing this position in place; empty = a new one */
  item?: ShoppingItem
  /** a new one for this task (FB-19) */
  taskId?: string
  onSaved?: () => void
  onCancel?: () => void
}

/**
 * The quick entry of a part – exactly six fields, the same on the shopping list and on the task
 * (decided by the workshop): description, number, quantity, state, recorded by, to be ordered by.
 * Enter saves. Everything else (supplier, dates, notes) is on the position's page.
 */
export function ShoppingEntryForm({ item, taskId, onSaved, onCancel }: ShoppingEntryFormProps) {
  const me = useMyEmployeeId()
  const { data: active } = useActiveEmployees()
  const { data: everyone } = useAllEmployees()
  const save = useSaveShoppingItem()
  const toast = useToast()
  const once = useSingleFlight()
  const [form, setForm] = useState<ShoppingForm>(() => (item ? formFromItem(item, me) : emptyShoppingForm(me)))
  // FB-29: "Erfasst von" of a new part follows when another person takes over the device
  useFollowPerson(me, (previous, next) => {
    if (!item) setForm((current) => ({ ...current, recordedById: followed(current.recordedById, previous, next) }))
  })
  const [showErrors, setShowErrors] = useState(false)
  const errors = shoppingErrors(form)

  // a person already on the position stays choosable (left, not for to-dos any more)
  const withCurrent = (list: typeof active, id: string) => {
    const current = everyone?.find((e) => e.id === id)
    return current && !(list ?? []).some((p) => p.id === id) ? [current, ...(list ?? [])] : (list ?? [])
  }
  const recorders = withCurrent(active, form.recordedById)
  const orderers = withCurrent(
    (active ?? []).filter((e) => e.selectableForTodos),
    form.orderById,
  )
  const set = <K extends keyof ShoppingForm>(field: K, value: ShoppingForm[K]) => setForm({ ...form, [field]: value })

  function submit(e: FormEvent) {
    e.preventDefault()
    setShowErrors(true)
    if (Object.keys(errors).length > 0) return
    once((done) =>
      save.mutate(
        { id: item?.id, request: toShoppingRequest(form, taskId, item) },
        {
          onSuccess: (saved) => {
            if (!item) {
              toast.success(`«${saved.description}» auf der Einkaufsliste`)
              // the next part: the persons stay – often one enters several
              setForm({ ...emptyShoppingForm(form.recordedById), orderById: form.orderById })
              setShowErrors(false)
            }
            onSaved?.()
          },
          onError: (error) => toast.error(`Nicht gespeichert: ${reasonOf(error)}`),
          onSettled: done,
        },
      ),
    )
  }

  const error = (field: keyof typeof errors) => (showErrors ? errors[field] : undefined)
  return (
    <div className={styles.entryBox}>
      <form className={styles.entry} onSubmit={submit} aria-label={item ? `«${item.description}» bearbeiten` : 'Teil erfassen'}>
        <div className={styles.description}>
          <TextField
            label="Bezeichnung"
            placeholder="z. B. Bremsscheiben vorne"
            maxLength={500}
            autoComplete="off"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            error={error('description')}
          />
        </div>
        <TextField label="Nummer" placeholder="Art.-/Teilenr." maxLength={60} autoComplete="off" value={form.partNumber} onChange={(e) => set('partNumber', e.target.value)} />
        <div className={styles.quantity}>
          <TextField label="Anzahl" inputMode="numeric" maxLength={4} autoComplete="off" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} error={error('quantity')} />
        </div>
        <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value as ShoppingStatus)}>
          {Object.entries(SHOPPING_STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
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
        <div className={styles.entryActions}>
          {onCancel && (
            <Button onClick={onCancel} disabled={save.isPending}>
              Abbrechen
            </Button>
          )}
          <Button type="submit" variant={item ? 'primary' : 'secondary'} icon={item ? Save : Plus} loading={save.isPending}>
            {item ? 'Speichern' : 'Teil hinzufügen'}
          </Button>
        </div>
      </form>
    </div>
  )
}
