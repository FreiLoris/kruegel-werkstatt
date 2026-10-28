import { ClipboardList, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { useToast } from '../../components/ui/toastContext'
import { useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { isClosed, SHOPPING_STATUS, turnOf, useChangeShoppingStatus, useDeleteShoppingItem, type ShoppingItem, type ShoppingStatus } from './shoppingApi'
import { ShoppingEntryForm } from './ShoppingEntryForm'
import { taskLabel } from './shoppingText'
import styles from './Shopping.module.css'

interface ShoppingTableProps {
  items: ShoppingItem[]
  canEdit: boolean
  /** the task of each position – not on the task itself */
  showTask?: boolean
  label: string
  /** shown in place of extra info under the description, e.g. the supplier's article number */
  detailOf?: (item: ShoppingItem) => string | null
}

/**
 * Who is up (FB-28). We are, but nobody orders – so nobody has a to-do to remind them: stands out.
 */
function Turn({ item }: { item: ShoppingItem }) {
  const turn = turnOf(item.status)
  if (!turn) return null
  const forgotten = turn === 'us' && !item.orderById
  return (
    <span className={[styles.turn, styles[turn], forgotten && styles.unanswered].filter(Boolean).join(' ')}>
      {forgotten ? 'wir sind dran – niemand zugewiesen' : turn === 'us' ? 'wir sind dran' : 'wartet auf Lieferant'}
    </span>
  )
}

/**
 * Positions in one line each (FB-19, FB-20): description with number and task, quantity, state (a
 * select, changed right there), who recorded it and who orders it. The description opens the
 * position with everything about it; pencil and bin edit and delete in place.
 */
export function ShoppingTable({ items, canEdit, showTask = false, label, detailOf }: ShoppingTableProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const { data: everyone } = useAllEmployees()
  const change = useChangeShoppingStatus()
  const remove = useDeleteShoppingItem()
  const confirm = useConfirm()
  const toast = useToast()
  const person = (id: string | null) => (id ? everyone?.find((e) => e.id === id) : undefined)

  function changeStatus(item: ShoppingItem, status: ShoppingStatus) {
    change.mutate({ id: item.id, status }, { onError: (error) => toast.error(`Nicht gespeichert: ${reasonOf(error)}`) })
  }

  async function deleteItem(item: ShoppingItem) {
    const ok = await confirm({ title: 'Position löschen?', text: `«${item.description}» wird gelöscht – mit Notizen und To-do.`, confirmLabel: 'Löschen', dangerous: true })
    if (!ok) return
    remove.mutate(item.id, { onError: (error) => toast.error(`Löschen fehlgeschlagen: ${reasonOf(error)}`) })
  }

  return (
    <table className={styles.table} aria-label={label}>
      <thead>
        <tr>
          <th scope="col">Bezeichnung</th>
          <th scope="col" className={styles.number}>
            Anzahl
          </th>
          <th scope="col">Status</th>
          <th scope="col">Erfasst · Bestellen durch</th>
          {canEdit && (
            <th scope="col">
              <span className={styles.srOnly}>Aktionen</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          if (editing === item.id) {
            return (
              <tr key={item.id}>
                <td colSpan={canEdit ? 5 : 4}>
                  <ShoppingEntryForm item={item} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
                </td>
              </tr>
            )
          }
          const recorder = person(item.recordedById)
          const orderer = person(item.orderById)
          const detail = detailOf?.(item)
          return (
            <tr key={item.id} className={[isClosed(item.status) && styles.closed, item.status === 'CANCELLED' && styles.cancelled].filter(Boolean).join(' ') || undefined}>
              <td>
                <Link to={`/shopping/${item.id}`} className={styles.itemLink}>
                  {item.description}
                </Link>
                <span className={styles.sub}>
                  {[item.partNumber && `Nr. ${item.partNumber}`, item.delivery, detail].filter(Boolean).join(' · ')}
                  {showTask && item.task && (
                    <Link to={`/tasks/${item.task.id}`} className={styles.task}>
                      <ClipboardList aria-hidden /> {taskLabel(item.task)}
                    </Link>
                  )}
                </span>
              </td>
              <td className={styles.number}>{item.quantity}</td>
              <td>
                {canEdit ? (
                  <select
                    className={[styles.status, styles[item.status]].join(' ')}
                    value={item.status}
                    aria-label={`Status von «${item.description}»`}
                    disabled={change.isPending}
                    onChange={(e) => changeStatus(item, e.target.value as ShoppingStatus)}
                  >
                    {Object.entries(SHOPPING_STATUS).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={[styles.status, styles[item.status]].join(' ')}>{SHOPPING_STATUS[item.status]}</span>
                )}
                <Turn item={item} />
              </td>
              <td>
                <span className={styles.people}>
                  {recorder ? <NameBadge name={recorder.name} color={recorder.color} /> : <span className="muted">–</span>}
                  <span aria-hidden>→</span>
                  {orderer ? <NameBadge name={orderer.name} color={orderer.color} /> : <span className="muted">nicht zugewiesen</span>}
                </span>
              </td>
              {canEdit && (
                <td className={styles.actions}>
                  <Button small variant="ghost" icon={Pencil} aria-label={`«${item.description}» bearbeiten`} onClick={() => setEditing(item.id)} />
                  <Button small variant="ghost" icon={Trash2} aria-label={`«${item.description}» löschen`} onClick={() => void deleteItem(item)} />
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
