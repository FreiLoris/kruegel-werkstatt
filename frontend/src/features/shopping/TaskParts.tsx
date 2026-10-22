import { useTaskShoppingItems } from './shoppingApi'
import { ShoppingEntryForm } from './ShoppingEntryForm'
import { ShoppingTable } from './ShoppingTable'
import styles from './Shopping.module.css'

/**
 * "Ersatzteilbestellungen" on the task (FB-19): its parts – without "Bearbeiten", without leaving the
 * page. The same six fields as on the shopping list, linked to this task by themselves; a part opens
 * its position with everything about it.
 */
export function TaskParts({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const { data: items, error } = useTaskShoppingItems(taskId)

  if (error) return <p className="muted">Teile konnten nicht geladen werden: {error.message}</p>
  if (!items) return <p className="muted">Lade …</p>

  const allArrived = items.length > 0 && items.every((i) => i.status === 'ARRIVED')
  return (
    <>
      {items.length === 0 ? (
        <p className="muted">Keine Teile bestellt.</p>
      ) : (
        <>
          {allArrived && <p className={styles.allArrived}>✓ Alle Teile geliefert</p>}
          <ShoppingTable items={items} canEdit={canEdit} label="Ersatzteilbestellungen" />
        </>
      )}
      {canEdit && <ShoppingEntryForm taskId={taskId} />}
    </>
  )
}
