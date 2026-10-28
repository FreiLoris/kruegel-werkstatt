import { useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { DoneFilter } from '../../components/ui/DoneFilter'
import { MaterialTabs } from '../stock/MaterialTabs'
import { useShoppingItems, type Turn } from './shoppingApi'
import { ShoppingBySupplier } from './ShoppingBySupplier'
import { ShoppingEntryForm } from './ShoppingEntryForm'
import { ShoppingTable } from './ShoppingTable'
import { ALL_DELIVERIES, byDelivery, byTask, byTurn, deliveriesOf, deliveryFilter, NO_DELIVERY, openSummary, type TaskFilter } from './shoppingText'
import styles from './Shopping.module.css'

/** FB-28: who is up – what we have to do, what we wait for */
const TURN_FILTERS: [Turn | 'all', string][] = [
  ['all', 'Alle'],
  ['us', 'Wir sind dran'],
  ['supplier', 'Wartet auf Lieferant'],
]

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
  // FB-30: what goes with the Tagesexpress – only offered when some positions say how they are ordered
  const deliveries = deliveriesOf(list.data ?? [])
  const delivery = deliveryFilter(params.get('via'), deliveries)
  // only the open ones have someone up
  const turn: Turn | 'all' = showDone ? 'all' : params.get('turn') === 'us' ? 'us' : params.get('turn') === 'supplier' ? 'supplier' : 'all'
  const items = list.data && byTurn(byDelivery(byTask(list.data, taskFilter), delivery), turn)

  function change(key: 'done' | 'view' | 'for' | 'via' | 'turn', value: string) {
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
          <div role="group" aria-label="Wer ist dran">
            {TURN_FILTERS.map(([value, label]) => (
              <Button key={value} small variant={turn === value ? 'primary' : 'secondary'} aria-pressed={turn === value} onClick={() => change('turn', value === 'all' ? '' : value)}>
                {label}
              </Button>
            ))}
          </div>
        )}
        {deliveries.length > 0 && (
          <div role="group" aria-label="Versandart">
            {[
              [ALL_DELIVERIES, 'Alle Versandarten'],
              ...deliveries.map((d) => [d, d]),
              [NO_DELIVERY, 'Ohne Versandart'],
            ].map(([value, label]) => (
              <Button key={value} small variant={delivery === value ? 'primary' : 'secondary'} aria-pressed={delivery === value} onClick={() => change('via', value)}>
                {label}
              </Button>
            ))}
          </div>
        )}
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
          <p className="muted">
            {list.data && list.data.length > 0 ? 'Keine Positionen mit diesem Filter.' : showDone ? 'Noch nichts erledigt.' : 'Nichts auf der Einkaufsliste.'}
          </p>
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
