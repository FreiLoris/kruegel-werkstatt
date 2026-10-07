import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { todayIso } from '../../lib/format'
import { useActiveEmployees } from '../employees/employeeApi'
import { useTodos, type TodoFilter } from './todoApi'
import { dueState } from './todoDue'
import { TodoForm } from './TodoForm'
import { TodoItem } from './TodoItem'
import styles from './TodoListView.module.css'

/** Person filter in the address: an employee ID, "none" (nobody yet) or empty (everyone) */
const NOBODY = 'none'

/**
 * To-dos as a list (8b, part of the pinboard since 8e): the open ones or the shopping list,
 * filtered by person from the employee list (bug #3: the old filter had five fixed names), the
 * active filter clearly marked. The person is in the address (`person=`), so a tablet can open
 * "Reto's to-dos" directly.
 */
export function TodoListView({ shopping }: { shopping: boolean }) {
  const [params, setParams] = useSearchParams()
  const canEdit = useCanEdit()
  const { data: active } = useActiveEmployees()
  const [showDone, setShowDone] = useState(false)
  const today = todayIso()

  const personParam = params.get('person') ?? ''
  const people = (active ?? []).filter((e) => e.selectableForTodos)
  // a person who is no longer in the list (left, not for to-dos any more) falls back to "everyone" –
  // but only once the list is loaded, otherwise a bookmarked filter would flash "everyone" first
  const person = !active || personParam === NOBODY || people.some((p) => p.id === personParam) ? personParam : ''

  const personFilter: TodoFilter = person === NOBODY ? { unassigned: true } : person ? { assigneeId: person } : {}
  const shown = useTodos({ ...personFilter, shopping })
  const done = useTodos({ ...personFilter, shopping, done: true })

  function choose(who: string) {
    const next = new URLSearchParams(params)
    if (who) next.set('person', who)
    else next.delete('person')
    setParams(next, { replace: true })
  }

  const overdue = (shown.data ?? []).filter((t) => dueState(t.dueDate, today) === 'overdue').length

  return (
    <>
      <p className={styles.summary}>
        {shown.data ? `${shown.data.length} offen` : '…'}
        {overdue > 0 && <span className={styles.overdue}> · {overdue} überfällig</span>}
      </p>

      {/* filled = active (UI review: the active filter was hardly visible, "Alle" never marked) */}
      <div className={styles.people} role="group" aria-label="Person">
        <Button small variant={person === '' ? 'primary' : 'secondary'} aria-pressed={person === ''} onClick={() => choose('')}>
          Alle
        </Button>
        {people.map((p) => (
          <Button key={p.id} small variant={person === p.id ? 'primary' : 'secondary'} aria-pressed={person === p.id} onClick={() => choose(p.id)}>
            <span className={styles.dot} style={{ background: p.color }} aria-hidden />
            {p.name}
          </Button>
        ))}
        <Button small variant={person === NOBODY ? 'primary' : 'secondary'} aria-pressed={person === NOBODY} onClick={() => choose(NOBODY)}>
          nicht zugewiesen
        </Button>
      </div>
      {canEdit && (
        <section className={styles.card} aria-label="Neues To-do">
          {/* new key per filter: the defaults follow the chosen person and tab */}
          <TodoForm
            key={`${person}-${shopping}`}
            defaults={{ assigneeId: person && person !== NOBODY ? person : undefined, shopping }}
            withShopping
          />
        </section>
      )}

      <section className={styles.card} aria-label={shopping ? 'Einkaufsliste' : 'Offene To-dos'}>
        {shown.error ? (
          <p className="muted">To-dos konnten nicht geladen werden: {shown.error.message}</p>
        ) : !shown.data ? (
          <p className="muted">Lade …</p>
        ) : shown.data.length === 0 ? (
          <p className="muted">{shopping ? 'Nichts einzukaufen.' : 'Nichts offen – schön.'}</p>
        ) : (
          <ul className={styles.list}>
            {shown.data.map((todo) => (
              <TodoItem key={todo.id} todo={todo} canEdit={canEdit} showTask withShopping />
            ))}
          </ul>
        )}
      </section>

      <Button variant="ghost" icon={showDone ? ChevronDown : ChevronRight} aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
        Erledigt
      </Button>
      {showDone && (
        <section className={styles.card} aria-label="Erledigt">
          {!done.data ? (
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
      )}
    </>
  )
}
