import { useMemo } from 'react'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { Button } from '../../../components/ui/Button'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate, formatTime } from '../../../lib/format'
import { useAllEmployees } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { tasksBetweenKey, useTasksBetween } from '../taskApi'
import { DayBoard } from './DayBoard'
import { dayColumns } from './dayColumns'
import styles from './DayView.module.css'

/** One day, one column per lift (6f). */
export function DayView({ date, onGo }: { date: string; onGo: (date: string) => void }) {
  const tasks = useTasksBetween(date, date)
  const { data: lifts } = useAllLifts()
  const { data: employees } = useAllEmployees()
  const { data: serviceItems } = useAllServiceItems()
  const canEdit = useCanEdit()

  const serviceItemNames = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])
  const columns = useMemo(() => dayColumns(tasks.data ?? [], lifts ?? []), [tasks.data, lifts])

  if (tasks.error) return <p className="muted">Termine konnten nicht geladen werden: {tasks.error.message}</p>
  if (!tasks.data || !lifts || !employees) return <p className="muted">Lade Termine …</p>

  return (
    <>
      {tasks.data.length === 0 && <NextAppointment after={date} onGo={onGo} />}
      <DayBoard
        columns={columns}
        tasks={tasks.data}
        dayKey={tasksBetweenKey(date, date)}
        employees={employees}
        serviceItemNames={serviceItemNames}
        canEdit={canEdit}
      />
    </>
  )
}

/** Empty day: when is the next appointment? (UI review: a big empty area said nothing) */
function NextAppointment({ after, onGo }: { after: string; onGo: (date: string) => void }) {
  const { data } = useTasksBetween(addDays(after, 1), addDays(after, 60))
  const next = data?.[0]
  if (!data) return null
  return (
    <p className={styles.next}>
      Keine Termine an diesem Tag.{' '}
      {next ? (
        <>
          Nächster Termin:{' '}
          <Button variant="ghost" small onClick={() => onGo(next.date)}>
            {WEEKDAYS_SHORT[weekdayOf(next.date)]} {formatDate(next.date)}, {formatTime(next.time)} – {next.customer.displayName}
          </Button>
        </>
      ) : (
        'Auch in den nächsten 60 Tagen keine.'
      )}
    </p>
  )
}
