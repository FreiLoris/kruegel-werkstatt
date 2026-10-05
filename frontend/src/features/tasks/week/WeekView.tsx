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
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { useToast } from '../../../components/ui/toastContext'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate, todayIso } from '../../../lib/format'
import { useAllEmployees, type Employee } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { usePublicHolidays } from '../../publicholidays/publicHolidayApi'
import { tasksBetweenKey, useMoveTask, useTasksBetween, type Task } from '../taskApi'
import { WeekCard } from './WeekCard'
import { weekDays, withDate } from './weekDays'
import styles from './WeekView.module.css'

/** Position "at the end" of a lift column – the server puts the task behind the last one */
const END_OF_COLUMN = 1_000_000

const dayLabel = (date: string) => `${WEEKDAYS_SHORT[weekdayOf(date)]} ${formatDate(date)}`

/** Drop on the day under the pointer/finger; between the columns the closest one (as in the day view). */
const dropTarget: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

/**
 * The week of the given Monday: one column per day, cards by time. A card dragged onto another day
 * moves the appointment there – same time, same lift, at the end of the lift column (bug #6:
 * the time is kept, not guessed). Absences of employees follow with phase 9.
 */
export function WeekView({ monday, onOpenDay }: { monday: string; onOpenDay: (date: string) => void }) {
  const sunday = addDays(monday, 6)
  const viewKey = tasksBetweenKey(monday, sunday)
  const tasks = useTasksBetween(monday, sunday)
  const { data: lifts } = useAllLifts()
  const { data: employees } = useAllEmployees()
  const { data: holidays } = usePublicHolidays(monday, sunday)
  const move = useMoveTask(viewKey)
  const canEdit = useCanEdit()
  const toast = useToast()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const days = useMemo(() => weekDays(monday, tasks.data ?? []), [monday, tasks.data])
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
    move.mutate(
      { id: task.id, liftId: task.liftId, position: END_OF_COLUMN, date, arranged: withDate(all, task.id, date) },
      {
        onSuccess: () =>
          toast.success(`${task.customer.displayName} auf ${dayLabel(date)} verschoben`),
        onError: (error) => toast.error(`${task.customer.displayName} konnte nicht verschoben werden: ${error.message}`),
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
            today={day.date === today}
            onOpen={() => onOpenDay(day.date)}
          >
            {day.tasks.map((task) => (
              <DraggableCard key={task.id} task={task} mechanic={mechanicOf(task)} liftName={liftNameOf(task)} disabled={!canEdit} />
            ))}
          </DayColumn>
        ))}
      </div>
      <DragOverlay>
        {active && <WeekCard task={active} mechanic={mechanicOf(active)} liftName={liftNameOf(active)} dragging />}
      </DragOverlay>
    </DndContext>
  )
}

function DayColumn({
  date,
  count,
  holiday,
  today,
  onOpen,
  children,
}: {
  date: string
  count: number
  holiday: string | undefined
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
  disabled,
}: {
  task: Task
  mechanic: Employee | undefined
  liftName: string | undefined
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled })
  return (
    <WeekCard
      ref={setNodeRef}
      task={task}
      mechanic={mechanic}
      liftName={liftName}
      style={{ opacity: isDragging ? 0.35 : undefined, cursor: disabled ? undefined : 'grab' }}
      {...attributes}
      {...listeners}
    />
  )
}
