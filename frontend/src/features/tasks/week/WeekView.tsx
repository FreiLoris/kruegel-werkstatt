import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useMemo, useState, type ReactNode } from 'react'
import { reasonOf } from '../../../api/errors'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { useToast } from '../../../components/ui/toastContext'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate, todayIso } from '../../../lib/format'
import { useAllEmployees, type Employee } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { usePublicHolidays } from '../../publicholidays/publicHolidayApi'
import { movedTo, minutesOf, withSchedule } from '../day/timeGrid'
import { useAbsences } from '../../absences/absenceApi'
import { AbsenceChip } from '../../absences/AbsenceChip'
import { absencesOn, type AbsenceOnDay } from '../../absences/absenceDays'
import { useCourtesyCarsByTask } from '../../bookings/useCourtesyCarsByTask'
import { tasksBetweenKey, useScheduleTask, useTasksBetween, type Task } from '../taskApi'
import { WeekCard } from './WeekCard'
import { weekDays } from './weekDays'
import styles from './WeekView.module.css'

const dayLabel = (date: string) => `${WEEKDAYS_SHORT[weekdayOf(date)]} ${formatDate(date)}`

/** Drop on the day under the pointer/finger; between the columns the closest one (as in the day view). */
const dropTarget: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

/**
 * The week of the given Monday: one column per day, cards by time. A card dragged onto another day
 * moves the appointment there – same time, duration and lift (bug #6: the time is kept, not
 * guessed). The lift must be free then, otherwise the server says by whom. Who is away (vacation,
 * sick, …) stands under each day's head (9a). Absences of employees follow with phase 9.
 */
export function WeekView({ monday, onOpenDay }: { monday: string; onOpenDay: (date: string) => void }) {
  const sunday = addDays(monday, 6)
  const viewKey = tasksBetweenKey(monday, sunday)
  const tasks = useTasksBetween(monday, sunday)
  const { data: lifts } = useAllLifts()
  const { data: employees } = useAllEmployees()
  const { data: holidays } = usePublicHolidays(monday, sunday)
  const absences = useAbsences(monday, sunday)
  const schedule = useScheduleTask(viewKey)
  const courtesyCars = useCourtesyCarsByTask(`${monday}T00:00`, `${addDays(monday, 7)}T00:00`)
  const canEdit = useCanEdit()
  const toast = useToast()
  const [activeId, setActiveId] = useState<string | null>(null)
  // After dropping: show the card on its new day until the tasks themselves do (no flash back)
  const [dropped, setDropped] = useState<{ tasks: Task[]; basedOn: Task[] } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Enter opens the task – only space picks a card up
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const shown = dropped && dropped.basedOn === tasks.data ? dropped.tasks : tasks.data
  const days = useMemo(() => weekDays(monday, shown ?? []), [monday, shown])
  const holidayOf = new Map((holidays ?? []).map((h) => [h.date, h.name]))
  const today = todayIso()

  if (tasks.error) return <p className="muted">Termine konnten nicht geladen werden: {tasks.error.message}</p>
  if (!tasks.data || !lifts || !employees) return <p className="muted">Lade Termine …</p>

  const all = tasks.data
  const mechanicOf = (task: Task) => employees.find((e) => e.id === task.mechanicId)
  const liftNameOf = (task: Task) => lifts.find((l) => l.id === task.liftId)?.name
  const active = activeId ? all.find((t) => t.id === activeId) : undefined

  function onDragEnd({ active: dragged, over }: DragEndEvent) {
    setActiveId(null)
    const task = all.find((t) => t.id === dragged.id)
    if (!task || !over || over.id === task.date) return
    const date = String(over.id)
    const newPlace = movedTo(task, task.liftId, date, minutesOf(task.time))
    const arranged = withSchedule(all, task.id, newPlace)
    setDropped({ tasks: arranged, basedOn: all })
    schedule.mutate(
      { id: task.id, schedule: newPlace, arranged },
      {
        onSuccess: () => toast.success(`${task.customer.displayName} auf ${dayLabel(date)} verschoben`),
        onError: (error) => {
          setDropped(null)
          toast.error(`${task.customer.displayName} konnte nicht verschoben werden: ${reasonOf(error)}`)
        },
      },
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dropTarget}
      onDragStart={({ active: dragged }) => setActiveId(String(dragged.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Leertaste zum Aufnehmen, Pfeiltasten zu einem anderen Tag, Leertaste zum Ablegen, Escape zum Abbrechen.',
        },
        announcements: {
          onDragStart: ({ active: a }) => `${all.find((t) => t.id === a.id)?.customer.displayName} aufgenommen.`,
          onDragOver: ({ over }) => (over ? `Über ${dayLabel(String(over.id))}.` : ''),
          onDragEnd: ({ over }) => (over ? `Abgelegt auf ${dayLabel(String(over.id))}.` : 'Abgebrochen.'),
          onDragCancel: () => 'Verschieben abgebrochen.',
        },
      }}
    >
      <div className={styles.week} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(10rem, 1fr))` }}>
        {days.map((day) => (
          <DayColumn
            key={day.date}
            date={day.date}
            count={day.tasks.length}
            holiday={holidayOf.get(day.date)}
            absences={absencesOn(absences.data ?? [], day.date)}
            nameOf={(id) => employees.find((e) => e.id === id)?.name ?? ''}
            today={day.date === today}
            onOpen={() => onOpenDay(day.date)}
          >
            {day.tasks.map((task) => (
              <DraggableCard
                key={task.id}
                task={task}
                mechanic={mechanicOf(task)}
                liftName={liftNameOf(task)}
                courtesyCar={courtesyCars.get(task.id)}
                disabled={!canEdit}
              />
            ))}
          </DayColumn>
        ))}
      </div>
      {/* no fly-back animation: the card is already shown on its new day */}
      <DragOverlay dropAnimation={null}>
        {active && (
          <WeekCard task={active} mechanic={mechanicOf(active)} liftName={liftNameOf(active)} courtesyCar={courtesyCars.get(active.id)} dragging />
        )}
      </DragOverlay>
    </DndContext>
  )
}

function DayColumn({
  date,
  count,
  holiday,
  absences,
  nameOf,
  today,
  onOpen,
  children,
}: {
  date: string
  count: number
  holiday: string | undefined
  /** who is away that day (9a – left open in 6g) */
  absences: AbsenceOnDay[]
  nameOf: (employeeId: string) => string
  today: boolean
  onOpen: () => void
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date })
  return (
    <section className={styles.day} aria-label={dayLabel(date)}>
      {/* equal headers for all days (UI review: the Monday header was higher because of the week label) */}
      <button type="button" className={[styles.header, today && styles.today].filter(Boolean).join(' ')} onClick={onOpen} title="Tagesansicht öffnen">
        <span className={styles.dayName}>
          {WEEKDAYS_SHORT[weekdayOf(date)]} {formatDate(date).slice(0, 6)}
        </span>
        <span className={holiday ? styles.holiday : styles.count}>{holiday ?? (count === 1 ? '1 Termin' : `${count} Termine`)}</span>
      </button>
      {/* always there (empty without absences) so the grid rows stay head / absences / appointments */}
      <div className={styles.absences} aria-label={absences.length > 0 ? 'Abwesend' : undefined}>
        {absences.map((day) => (
          <AbsenceChip key={day.absence.id} day={day} name={nameOf(day.absence.employeeId)} />
        ))}
      </div>
      <div ref={setNodeRef} className={[styles.drop, isOver && styles.over, holiday && styles.holidayDrop].filter(Boolean).join(' ')}>
        {children}
      </div>
    </section>
  )
}

function DraggableCard({
  task,
  mechanic,
  liftName,
  courtesyCar,
  disabled,
}: {
  task: Task
  mechanic: Employee | undefined
  liftName: string | undefined
  courtesyCar: string | undefined
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled })
  return (
    <WeekCard
      ref={setNodeRef}
      task={task}
      mechanic={mechanic}
      liftName={liftName}
      courtesyCar={courtesyCar}
      style={{ opacity: isDragging ? 0.35 : undefined, cursor: disabled ? undefined : 'grab' }}
      {...attributes}
      {...listeners}
    />
  )
}
