import { useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { DoneFilter } from '../../components/ui/DoneFilter'
import { MaterialTabs } from '../stock/MaterialTabs'
import { useShoppingItems } from './shoppingApi'
import { ShoppingBySupplier } from './ShoppingBySupplier'
import { ShoppingEntryForm } from './ShoppingEntryForm'
import { ShoppingTable } from './ShoppingTable'
import { byTask, openSummary, type TaskFilter } from './shoppingText'
import styles from './Shopping.module.css'

const TASK_FILTERS: [TaskFilter, string][] = [
  ['all', 'Alle'],
  ['task', 'Für Aufträge'],
  ['workshop', 'Ohne Auftrag'],
]

/**
 * The shopping list rebuilt (FB-20): ONE list, not by person (decided by the workshop) – a line per
 * position with its task, the quick entry with the six fields above it. "Offen | Erledigt" (arrived)
 * as before, with or without task as a filter, and by supplier to order everything from one at once
 * (FB-09). Filters are in the address, so a tablet can open them directly.
 */
export function ShoppingListPage() {
  const [params, setParams] = useSearchParams()
  const canEdit = useCanEdit()
  const showDone = params.get('done') === '1'
  const bySupplier = params.get('view') === 'supplier'
  const taskFilter: TaskFilter = params.get('for') === 'task' ? 'task' : params.get('for') === 'workshop' ? 'workshop' : 'all'
  const open = useShoppingItems(false)
  const arrived = useShoppingItems(true)
  const list = showDone ? arrived : open
  const items = list.data && byTask(list.data, taskFilter)

  function change(key: 'done' | 'view' | 'for', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <>
      <MaterialTabs />
      <div className={styles.header}>
        <h1>Einkaufsliste</h1>
        <DoneFilter done={showDone} onChange={(on) => change('done', on ? '1' : '')} openCount={open.data?.length} />
      </div>

      <div className={styles.filters}>
        <div role="group" aria-label="Auftrag">
          {TASK_FILTERS.map(([value, label]) => (
            <Button key={value} small variant={taskFilter === value ? 'primary' : 'secondary'} aria-pressed={taskFilter === value} onClick={() => change('for', value === 'all' ? '' : value)}>
              {label}
            </Button>
          ))}
        </div>
        {!showDone && (
          <div role="group" aria-label="Ansicht">
            <Button small variant={bySupplier ? 'secondary' : 'primary'} aria-pressed={!bySupplier} onClick={() => change('view', '')}>
              Liste
            </Button>
            <Button small variant={bySupplier ? 'primary' : 'secondary'} aria-pressed={bySupplier} onClick={() => change('view', 'supplier')}>
              Nach Lieferant
            </Button>
          </div>
        )}
        {!showDone && open.data && <span className="muted">{openSummary(open.data) || 'Nichts offen'}</span>}
      </div>

      {!showDone && canEdit && (
        <section className={styles.card} aria-label="Teil erfassen">
          <ShoppingEntryForm />
        </section>
      )}

      {list.error ? (
        <p className="muted">Einkaufsliste konnte nicht geladen werden: {list.error.message}</p>
      ) : !items ? (
        <p className="muted">Lade …</p>
      ) : items.length === 0 ? (
        <section className={styles.card}>
          <p className="muted">{showDone ? 'Noch nichts erledigt.' : 'Nichts auf der Einkaufsliste.'}</p>
        </section>
      ) : bySupplier && !showDone ? (
        <ShoppingBySupplier items={items} canEdit={canEdit} />
      ) : (
        <section className={styles.card}>
          <ShoppingTable items={items} canEdit={canEdit} showTask label={showDone ? 'Geliefert' : 'Einkaufsliste'} />
        </section>
      )}
    </>
  )
}
