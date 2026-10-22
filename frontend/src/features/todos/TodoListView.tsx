import { useSearchParams } from 'react-router'
import { useToday } from '../../lib/clock'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { DoneFilter } from '../../components/ui/DoneFilter'
import { useActiveEmployees } from '../employees/employeeApi'
import { useTodos, type Todo, type TodoFilter } from './todoApi'
import { dueState } from './todoDue'
import { TodoBoard } from './TodoBoard'
import { TodoForm } from './TodoForm'
import { TodoItem } from './TodoItem'
import styles from './TodoListView.module.css'

/** Person filter in the address: an employee ID, "none" (nobody yet) or empty (everyone) */
const NOBODY = 'none'

/**
 * The to-dos – a page of its own since FB-04 (before: a view of the pinboard; the shopping list has
 * its own since FB-20). Filtered by person from the employee list (bug #3), "Offen | Erledigt" like on the
 * pinboard. Person and filter are in the address (`person=`, `done=1`), so a tablet can open
 * "Reto's to-dos" directly. Everyone's open to-dos are in columns per person, dragged to reassign.
 */
export function TodoListView() {
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
  const open = useTodos(personFilter)
  const done = useTodos({ ...personFilter, done: true })

  function change(key: 'person' | 'done', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const overdue = (open.data ?? []).filter((t) => dueState(t.dueDate, today) === 'overdue').length
  // columns only for everyone's open to-dos – one person is one list
  const columns = !showDone && person === ''

  return (
    // the columns use the whole screen width, like the pinboard (AppLayout: data-wide)
    <div data-wide={columns ? '' : undefined}>
      <div className={styles.header}>
        <h1>To-dos</h1>
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
              <TodoForm key={person} defaults={{ assigneeId: person && person !== NOBODY ? person : undefined }} />
            </section>
          )}

          {open.error ? (
            <p className="muted">To-dos konnten nicht geladen werden: {open.error.message}</p>
          ) : !open.data ? (
            <p className="muted">Lade …</p>
          ) : columns ? (
            <TodoBoard todos={open.data} people={people} canEdit={canEdit} />
          ) : open.data.length === 0 ? (
            <section className={styles.card}>
              <p className="muted">Nichts offen – schön.</p>
            </section>
          ) : (
            <section className={styles.card} aria-label="Offene To-dos">
              <OpenList todos={open.data} canEdit={canEdit} showAssignee={person === ''} />
            </section>
          )}
        </>
      )}
    </div>
  )
}

/** Open to-dos; the person only where no filter says who */
function OpenList({ todos, canEdit, showAssignee }: { todos: Todo[]; canEdit: boolean; showAssignee: boolean }) {
  return (
    <ul className={styles.list}>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} canEdit={canEdit} showTask showAssignee={showAssignee && todo.assigneeId !== null} />
      ))}
    </ul>
  )
}
