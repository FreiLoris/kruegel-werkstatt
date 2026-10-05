import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { Button } from '../../../components/ui/Button'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate, formatTime } from '../../../lib/format'
import { useAllEmployees } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { useCourtesyCarsByTask } from '../../bookings/useCourtesyCarsByTask'
import { tasksOfDayKey, useTasksBetween, useTasksOfDay } from '../taskApi'
import { newTaskUrl } from '../wizard/appointmentForm'
import { DayGrid } from './DayGrid'
import styles from './DayView.module.css'

/** Pixels per minute in the day view – one hour = 90 px, enough for customer, vehicle and work */
const SCALE = 1.5

/** One day as a time grid per lift (6k). Dragging open the empty grid starts a new task there. */
export function DayView({ date, onGo }: { date: string; onGo: (date: string) => void }) {
  const tasks = useTasksOfDay(date)
  const { data: lifts } = useAllLifts()
  const { data: employees } = useAllEmployees()
  const { data: serviceItems } = useAllServiceItems()
  const canEdit = useCanEdit()
  const navigate = useNavigate()
  const courtesyCars = useCourtesyCarsByTask(`${date}T00:00`, `${addDays(date, 1)}T00:00`)

  const serviceItemNames = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])

  if (tasks.error) return <p className="muted">Termine konnten nicht geladen werden: {tasks.error.message}</p>
  if (!tasks.data || !lifts || !employees) return <p className="muted">Lade Termine …</p>

  return (
    <>
      {tasks.data.length === 0 && <NextAppointment after={date} onGo={onGo} />}
      <DayGrid
        date={date}
        tasks={tasks.data}
        lifts={lifts}
        mode="plan"
        scale={SCALE}
        canEdit={canEdit}
        onPick={(slot) => navigate(newTaskUrl(slot))}
        viewKey={tasksOfDayKey(date)}
        employees={employees}
        serviceItemNames={serviceItemNames}
        courtesyCars={courtesyCars}
      />
      {canEdit && <p className={styles.hint}>Im leeren Raster ziehen (oder tippen) legt dort einen neuen Auftrag an.</p>}
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
