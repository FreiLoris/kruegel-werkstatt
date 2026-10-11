import { UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { useCanEdit, useDevicePerson } from '../../../app/person/useDevicePerson'
import { Button } from '../../../components/ui/Button'
import { useAbsences, type Absence } from '../../absences/absenceApi'
import { AbsenceChip } from '../../absences/AbsenceChip'
import { absencesOn } from '../../absences/absenceDays'
import { AbsenceDialog } from '../../absences/AbsenceDialog'
import { useAllEmployees } from '../../employees/employeeApi'
import { useTodos } from '../../todos/todoApi'
import { TodoItem } from '../../todos/TodoItem'
import styles from './DayInfo.module.css'

/** All open to-dos – the same query as the to-do list, so it is loaded once */
const OPEN_TODOS = {}

type Dialog = { kind: 'new' } | { kind: 'open'; absence: Absence } | null

/**
 * What else matters on this day, above the lifts (12b): who is away or – with flexible hours – in,
 * and the open to-dos due that day ("Sortimo Holzböden abholen am 13.10."). "Anwesend" enters the
 * person of this device for this day with two clicks.
 */
export function DayInfo({ date }: { date: string }) {
  const device = useDevicePerson()
  const { data: employees } = useAllEmployees()
  const { data: absences } = useAbsences(date, date)
  const { data: todos } = useTodos(OPEN_TODOS)
  const [dialog, setDialog] = useState<Dialog>(null)

  const me = device.kind === 'person' ? device.person : undefined
  const canEdit = useCanEdit()
  const team = absencesOn(absences ?? [], date)
  const due = (todos ?? []).filter((todo) => todo.dueDate === date)
  const nameOf = (id: string) => employees?.find((e) => e.id === id)?.name ?? ''
  const open = dialog?.kind === 'open' ? dialog.absence : undefined

  if (team.length === 0 && due.length === 0 && !canEdit) return null

  return (
    <section className={styles.info} aria-label="Team und To-dos an diesem Tag">
      <div className={styles.team}>
        {team.length === 0 && <span className="muted">Niemand abwesend eingetragen.</span>}
        {team.map((day) => (
          <button
            key={day.absence.id}
            type="button"
            className={styles.entry}
            onClick={() => setDialog({ kind: 'open', absence: day.absence })}
            aria-label={`${nameOf(day.absence.employeeId)}: Eintrag öffnen`}
          >
            <AbsenceChip day={day} name={nameOf(day.absence.employeeId)} />
          </button>
        ))}
        {canEdit && (
          <Button small variant="ghost" icon={UserRoundCheck} onClick={() => setDialog({ kind: 'new' })}>
            Anwesend
          </Button>
        )}
      </div>

      {due.length > 0 && (
        <ul className={styles.todos} aria-label="To-dos an diesem Tag">
          {due.map((todo) => (
            <TodoItem key={todo.id} todo={todo} canEdit={canEdit} showTask withShopping />
          ))}
        </ul>
      )}

      {dialog && (
        <AbsenceDialog
          key={open?.id ?? 'new'}
          absence={open}
          fresh={dialog.kind === 'new' ? { employeeId: me?.id ?? '', startDate: date, endDate: date, category: 'PRESENT' } : undefined}
          employees={(employees ?? []).filter((e) => e.active || e.id === open?.employeeId)}
          readOnly={!canEdit}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}
