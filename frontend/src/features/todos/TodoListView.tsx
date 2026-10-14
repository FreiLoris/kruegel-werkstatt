import { useSearchParams } from 'react-router'
import { useToday } from '../../lib/clock'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { DoneFilter } from '../../components/ui/DoneFilter'
import { useActiveEmployees } from '../employees/employeeApi'
import { PartsToOrder } from '../tasks/parts/PartsToOrder'
import { ShoppingBySupplier } from './ShoppingBySupplier'
import { useTodos, type Todo, type TodoFilter } from './todoApi'
import { dueState } from './todoDue'
import { TodoBoard } from './TodoBoard'
import { TodoForm } from './TodoForm'
import { TodoItem } from './TodoItem'
import styles from './TodoListView.module.css'

/** Person filter in the address: an employee ID, "none" (nobody yet) or empty (everyone) */
const NOBODY = 'none'

/**
 * The to-dos or the shopping list – each a page of its own since FB-04 (before: views of the
 * pinboard). Filtered by person from the employee list (bug #3), "Offen | Erledigt" like on the
 * pinboard. Person and filter are in the address (`person=`, `done=1`), so a tablet can open
 * "Reto's to-dos" directly. Everyone's open to-dos are in columns per person, dragged to reassign.
 */
export function TodoListView({ shopping }: { shopping: boolean }) {
  const [params, setParams] = useSearchParams()
  const canEdit = useCanEdit()
  const { data: active } = useActiveEmployees()
  const today = useToday()

  const personParam = params.get('person') ?? ''
  const showDone = params.get('done') === '1'
  const people = (active ?? []).filter((e) => e.selectableForTodos)
  // a person who is no longer in the list (left, not for to-dos any more) falls back to "everyone" –
  // but only once the list is loaded, otherwise a bookmarked filter would flash "everyone" first
  const person = !active || personParam === NOBODY || people.some((p) => p.id === personParam) ? personParam : ''

  const personFilter: TodoFilter = person === NOBODY ? { unassigned: true } : person ? { assigneeId: person } : {}
  const open = useTodos({ ...personFilter, shopping })
  const done = useTodos({ ...personFilter, shopping, done: true })

  function change(key: 'person' | 'done', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const overdue = (open.data ?? []).filter((t) => dueState(t.dueDate, today) === 'overdue').length
  // columns only for everyone's open to-dos – one person, or the shopping list, is one list
  const columns = !shopping && !showDone && person === ''

  return (
    // the columns use the whole screen width, like the pinboard (AppLayout: data-wide)
    <div data-wide={columns ? '' : undefined}>
      <div className={styles.header}>
        <h1>{shopping ? 'Einkaufsliste' : 'To-dos'}</h1>
        <DoneFilter done={showDone} onChange={(on) => change('done', on ? '1' : '')} openCount={open.data?.length} />
      </div>

      {!showDone && (
        <p className={styles.summary}>
          {open.data ? `${open.data.length} offen` : '…'}
          {overdue > 0 && <span className={styles.overdue}> · {overdue} überfällig</span>}
        </p>
      )}

      {/* filled = active (UI review: the active filter was hardly visible, "Alle" never marked) */}
      <div className={styles.people} role="group" aria-label="Person">
        <Button small variant={person === '' ? 'primary' : 'secondary'} aria-pressed={person === ''} onClick={() => change('person', '')}>
          Alle
        </Button>
        {people.map((p) => (
          <Button key={p.id} small variant={person === p.id ? 'primary' : 'secondary'} aria-pressed={person === p.id} onClick={() => change('person', p.id)}>
            <span className={styles.dot} style={{ background: p.color }} aria-hidden />
            {p.name}
          </Button>
        ))}
        <Button small variant={person === NOBODY ? 'primary' : 'secondary'} aria-pressed={person === NOBODY} onClick={() => change('person', NOBODY)}>
          nicht zugewiesen
        </Button>
      </div>

      {showDone ? (
        <section className={styles.card} aria-label="Erledigt">
          {done.error ? (
            <p className="muted">To-dos konnten nicht geladen werden: {done.error.message}</p>
          ) : !done.data ? (
            <p className="muted">Lade …</p>
          ) : done.data.length === 0 ? (
            <p className="muted">Noch nichts erledigt.</p>
          ) : (
            <ul className={styles.list}>
              {done.data.map((todo) => (
                <TodoItem key={todo.id} todo={todo} canEdit={canEdit} showTask />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {canEdit && (
            <section className={styles.card} aria-label="Neues To-do">
              {/* new key per filter: the defaults follow the chosen person and page */}
              <TodoForm
                key={`${person}-${shopping}`}
                defaults={{ assigneeId: person && person !== NOBODY ? person : undefined, shopping }}
                withShopping
              />
            </section>
          )}

          {/* material of the orders (12c) belongs to nobody – shown with every person filter */}
          {shopping && <PartsToOrder canEdit={canEdit} />}

          {open.error ? (
            <p className="muted">To-dos konnten nicht geladen werden: {open.error.message}</p>
          ) : !open.data ? (
            <p className="muted">Lade …</p>
          ) : columns ? (
            <TodoBoard todos={open.data} people={people} canEdit={canEdit} />
          ) : shopping && open.data.length > 0 ? (
            // 13g: by supplier – order everything from one at once
            <ShoppingBySupplier entries={open.data} canEdit={canEdit} showAssignee={person === ''} />
          ) : open.data.length === 0 ? (
            <section className={styles.card}>
              <p className="muted">{shopping ? 'Nichts einzukaufen.' : 'Nichts offen – schön.'}</p>
            </section>
          ) : (
            <section className={styles.card} aria-label={shopping ? 'Einkaufsliste' : 'Offene To-dos'}>
              <OpenList todos={open.data} canEdit={canEdit} showAssignee={person === ''} />
            </section>
          )}
        </>
      )}
    </div>
  )
}

/** Open to-dos with the shopping list tick in the edit form; the person only where no filter says who */
function OpenList({ todos, canEdit, showAssignee }: { todos: Todo[]; canEdit: boolean; showAssignee: boolean }) {
  return (
    <ul className={styles.list}>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} canEdit={canEdit} showTask withShopping showAssignee={showAssignee && todo.assigneeId !== null} />
      ))}
    </ul>
  )
}
