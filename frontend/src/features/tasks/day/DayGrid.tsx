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
  type DragMoveEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import type { QueryKey } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { reasonOf } from '../../../api/errors'
import { useToast } from '../../../components/ui/toastContext'
import { useClock } from '../../../lib/clock'
import type { Employee } from '../../employees/employeeApi'
import type { Lift } from '../../lifts/liftApi'
import { useScheduleTask, type Task } from '../taskApi'
import { timeRange } from '../taskTime'
import { dayColumns, NO_LIFT, type DayColumn } from './dayColumns'
import styles from './DayGrid.module.css'
import { TaskCard } from './TaskCard'
import {
  blockingIn,
  minutesOf,
  movedTo,
  placeInColumn,
  resizedTo,
  selection,
  SNAP_MINUTES,
  snap,
  spanOn,
  timeOf,
  visibleRange,
  withSchedule,
  type Placed,
  type Schedule,
} from './timeGrid'

/** A chosen place for a new task: lift, start and end */
export type Slot = Schedule

const DAY_MINUTES = 24 * 60

/** Drop where the pointer is; for the keyboard (no pointer) the closest column */
const dropTarget: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

interface DayGridProps {
  date: string
  tasks: Task[]
  lifts: Lift[]
  /**
   * plan: day view – move blocks, drag their end, drag open the empty grid for a new task.
   * pick: wizard – the tasks are only shown, dragging open the grid chooses the slot.
   */
  mode: 'plan' | 'pick'
  /** Pixels per minute – the day view is roomier than the wizard */
  scale: number
  canEdit: boolean
  /** A slot was dragged open / tapped in the empty grid */
  onPick: (slot: Slot) => void
  /** pick: the slot chosen so far (highlighted) */
  picked?: Slot | null
  /** pick while editing: the task itself is not shown – the chosen slot is its new place */
  hiddenTaskId?: string
  /** plan: query that holds `tasks` – updated right away when a block is moved */
  viewKey?: QueryKey
  employees?: Employee[]
  serviceItemNames?: ReadonlyMap<string, string>
  /** task ID → courtesy car name, shown on the blocks */
  courtesyCars?: ReadonlyMap<string, string>
}

/** Finger: hold this long before dragging opens a time (moving earlier = scrolling) */
const HOLD_MS = 350
const MOVE_TOLERANCE_PX = 8

/**
 * A time being dragged open. Mouse: right away. Finger: only after holding still ({@link HOLD_MS}),
 * like in Outlook – before that, a move scrolls and a lift of the finger is a tap (one hour).
 */
type Creating = { columnId: string; from: number; to: number; pointerId: number; touch: boolean; held: boolean; startY: number }

/**
 * A day as a time grid like Outlook (6k): one column per lift, time downwards, tasks as blocks as
 * long as they take. Snaps to quarter hours. Overlaps are allowed only in "Ohne Lift" (side by side);
 * a lift is checked by the server, the grid already shows a dragged block red where it would collide.
 *
 * Mouse: drag a block = new time/lift, drag its lower edge = new end, drag in the empty grid = new task.
 * Tablet: hold a block briefly to drag it; hold the empty grid briefly and drag = new task from–to,
 * tap = new task of one hour.
 * Keyboard: space picks a block up, arrows move it (15 min / one lift), space drops; Shift+arrows change the end.
 */
export function DayGrid({
  date,
  tasks,
  lifts,
  mode,
  scale,
  canEdit,
  onPick,
  picked,
  hiddenTaskId,
  viewKey = [],
  employees = [],
  serviceItemNames = new Map(),
  courtesyCars,
}: DayGridProps) {
  const toast = useToast()
  const schedule = useScheduleTask(viewKey)
  const planning = mode === 'plan' && canEdit
  // After a change: the new place stays on screen until the tasks themselves show it (no flash back)
  const [pending, setPending] = useState<{ tasks: Task[]; basedOn: Task[] } | null>(null)
  const current = pending && pending.basedOn === tasks ? pending.tasks : tasks
  const shown = useMemo(() => (hiddenTaskId ? current.filter((t) => t.id !== hiddenTaskId) : current), [current, hiddenTaskId])

  const columns = useMemo(() => dayColumns(shown, lifts), [shown, lifts])
  const placedByColumn = useMemo(
    () => new Map(columns.map((column) => [column.id, placeInColumn(column.tasks, date)])),
    [columns, date],
  )
  const byId = useMemo(() => new Map(shown.map((task) => [task.id, task])), [shown])
  const range = useMemo(() => visibleRange(shown, date), [shown, date])
  const clock = useClock()
  // the "now" line only on today – it moves every minute (one clock for the app, 10c)
  const now = date === clock.today ? minutesOf(clock.time) : null

  const [dragging, setDragging] = useState<{ id: string; columnId: string; start: number } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; end: number } | null>(null)
  const [creating, setCreating] = useState<Creating | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const columnWidth = useRef(0)
  const holdTimer = useRef<number | undefined>(undefined)

  // While a finger drags open a time the page must not scroll. touch-action cannot change in the
  // middle of a gesture, so the touch moves are cancelled (needs a non-passive listener).
  const fingerHolds = creating?.touch === true && creating.held
  useEffect(() => {
    if (!fingerHolds) return
    const stop = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    return () => document.removeEventListener('touchmove', stop)
  }, [fingerHolds])
  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  const y = (minutes: number) => (Math.min(Math.max(minutes, range.start), range.end) - range.start) * scale
  const minutesAt = (clientY: number, body: Element) => range.start + (clientY - body.getBoundingClientRect().top) / scale

  // keyboard dragging: one step = a quarter hour down/up or one lift sideways
  const keyboardSteps: KeyboardCoordinateGetter = (event, { currentCoordinates: c }) => {
    const step = SNAP_MINUTES * scale
    switch (event.code) {
      case 'ArrowDown':
        return { ...c, y: c.y + step }
      case 'ArrowUp':
        return { ...c, y: c.y - step }
      case 'ArrowRight':
        return { ...c, x: c.x + columnWidth.current }
      case 'ArrowLeft':
        return { ...c, x: c.x - columnWidth.current }
    }
    return undefined
  }
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Enter opens the task – only space picks a block up
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardSteps,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  function save(task: Task, newPlace: Schedule) {
    const arranged = withSchedule(shown, task.id, newPlace)
    setPending({ tasks: arranged, basedOn: tasks })
    schedule.mutate(
      { id: task.id, schedule: newPlace, arranged },
      {
        onError: (error) => {
          setPending(null)
          toast.error(`${task.customer.displayName} konnte nicht verschoben werden: ${reasonOf(error)}`)
        },
      },
    )
  }

  // ── moving a block ──────────────────────────────────────────────

  function onDragStart(id: string) {
    const task = byId.get(id)!
    columnWidth.current = scroller.current?.querySelector('[data-grid-body]')?.getBoundingClientRect().width ?? 0
    setDragging({ id, columnId: task.liftId ?? NO_LIFT, start: spanOn(task, date).start })
  }

  function onDragMove({ active, over, delta }: DragMoveEvent) {
    const task = byId.get(String(active.id))!
    const span = spanOn(task, date)
    const start = Math.min(Math.max(snap(span.start + delta.y / scale), 0), DAY_MINUTES - SNAP_MINUTES)
    const columnId = over ? String(over.id) : (dragging?.columnId ?? '')
    if (dragging?.start !== start || dragging.columnId !== columnId) setDragging({ id: task.id, columnId, start })
  }

  function onDragEnd({ active }: DragEndEvent) {
    const target = dragging
    setDragging(null)
    if (!target) return
    const task = byId.get(String(active.id))!
    const column = columns.find((c) => c.id === target.columnId)
    if (!column) return
    const span = spanOn(task, date)
    if (column.liftId === task.liftId && target.start === span.start) return
    // visibly taken: say so right away instead of letting the block jump there and back
    const end = target.start + span.end - span.start
    const blocking = column.liftId && blockingIn(placedByColumn.get(column.id) ?? [], target.start, end, task.id)
    if (blocking) {
      toast.error(`${column.title} ist um ${timeOf(target.start)} belegt (${blocking.task.customer.displayName}).`)
      return
    }
    save(task, movedTo(task, column.liftId, date, target.start))
  }

  // ── dragging the lower edge ─────────────────────────────────────

  function startResize(e: PointerEvent<HTMLDivElement>, task: Task) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setResizing({ id: task.id, end: spanOn(task, date).end })
  }

  function moveResize(e: PointerEvent<HTMLDivElement>, task: Task) {
    if (resizing?.id !== task.id) return
    const body = e.currentTarget.closest('[data-grid-body]')!
    const end = Math.max(snap(minutesAt(e.clientY, body)), spanOn(task, date).start + SNAP_MINUTES)
    if (end !== resizing.end) setResizing({ id: task.id, end })
  }

  function endResize(task: Task) {
    const target = resizing
    setResizing(null)
    if (target?.id === task.id && target.end !== spanOn(task, date).end) save(task, resizedTo(task, date, target.end))
  }

  /** Shift+arrow on a focused block: end a quarter hour later/earlier */
  function resizeByKey(e: KeyboardEvent, task: Task): boolean {
    if (!e.shiftKey || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return false
    e.preventDefault()
    const span = spanOn(task, date)
    if (span.endsAfter) return true
    const end = span.end + (e.key === 'ArrowDown' ? SNAP_MINUTES : -SNAP_MINUTES)
    if (end > span.start) save(task, resizedTo(task, date, end))
    return true
  }

  // ── dragging open the empty grid ────────────────────────────────

  function startCreate(e: PointerEvent<HTMLDivElement>, column: DayColumn) {
    // only on the empty grid – blocks have their own gestures
    if (e.target !== e.currentTarget || e.button !== 0 || (mode === 'plan' && !canEdit)) return
    const from = Math.floor(minutesAt(e.clientY, e.currentTarget) / SNAP_MINUTES) * SNAP_MINUTES
    const touch = e.pointerType === 'touch'
    const { pointerId } = e
    if (touch) {
      // the finger may want to scroll – it opens a time only after holding still
      window.clearTimeout(holdTimer.current)
      holdTimer.current = window.setTimeout(() => {
        setCreating((c) => (c && c.pointerId === pointerId ? { ...c, held: true } : c))
        navigator.vibrate?.(15)
      }, HOLD_MS)
    } else {
      e.currentTarget.setPointerCapture(pointerId)
    }
    setCreating({ columnId: column.id, from, to: from, pointerId, touch, held: !touch, startY: e.clientY })
  }

  function moveCreate(e: PointerEvent<HTMLDivElement>) {
    if (!creating || e.pointerId !== creating.pointerId) return
    if (!creating.held) {
      // moved before holding still: the finger scrolls
      if (Math.abs(e.clientY - creating.startY) > MOVE_TOLERANCE_PX) cancelCreate()
      return
    }
    const to = snap(minutesAt(e.clientY, e.currentTarget))
    if (to !== creating.to) setCreating({ ...creating, to })
  }

  function endCreate(e: PointerEvent<HTMLDivElement>, column: DayColumn) {
    window.clearTimeout(holdTimer.current)
    if (!creating || e.pointerId !== creating.pointerId) return
    // where the pointer is let go counts – the last move may have been earlier; a tap = from only
    const to = creating.held ? snap(minutesAt(e.clientY, e.currentTarget)) : creating.from
    setCreating(null)
    onPick({ liftId: column.liftId, ...selection(date, creating.from, to) })
  }

  function cancelCreate() {
    window.clearTimeout(holdTimer.current)
    setCreating(null)
  }

  const activeTask = dragging ? byId.get(dragging.id) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dropTarget}
      onDragStart={({ active }) => onDragStart(String(active.id))}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Leertaste zum Aufnehmen, Pfeiltasten hoch/runter um eine Viertelstunde, links/rechts zu einem anderen Lift, ' +
            'Leertaste zum Ablegen. Umschalt+Pfeiltasten verschieben das Ende.',
        },
        announcements: {
          onDragStart: ({ active }) => `${byId.get(String(active.id))?.customer.displayName} aufgenommen.`,
          onDragOver: () => '',
          onDragMove: () => (dragging ? `${timeOf(dragging.start)}, ${columns.find((c) => c.id === dragging.columnId)?.title}.` : ''),
          onDragEnd: () => 'Abgelegt.',
          onDragCancel: () => 'Verschieben abgebrochen.',
        },
      }}
    >
      <div ref={scroller} className={[styles.scroller, mode === 'pick' && styles.compact].filter(Boolean).join(' ')}>
        <div className={styles.grid} style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(${mode === 'pick' ? '6rem' : '13rem'}, 1fr))` }}>
          <div className={styles.corner} />
          {columns.map((column) => (
            <h2 key={column.id} className={styles.columnTitle}>
              {column.title} <span className="muted">{column.tasks.length}</span>
            </h2>
          ))}

          <TimeAxis range={range} scale={scale} />

          {columns.map((column) => {
            const placed = placedByColumn.get(column.id) ?? []
            const ghost = ghostIn(column, placed)
            return (
              <ColumnBody
                key={column.id}
                id={column.id}
                height={(range.end - range.start) * scale}
                hourHeight={60 * scale}
                creatable={mode === 'pick' || canEdit}
                onPointerDown={(e) => startCreate(e, column)}
                onPointerMove={moveCreate}
                onPointerUp={(e) => endCreate(e, column)}
                onPointerCancel={cancelCreate}
              >
                {placed.map((p) => {
                  const end = resizing?.id === p.task.id ? resizing.end : p.end
                  const style: CSSProperties = {
                    top: y(p.start),
                    height: Math.max(y(end) - y(p.start), 14),
                    left: `${(p.lane / p.lanes) * 100}%`,
                    width: `${100 / p.lanes}%`,
                  }
                  return mode === 'pick' ? (
                    <div key={p.task.id} className={styles.chip} style={style} title={chipTitle(p.task)}>
                      {timeRange(p.task.date, p.task.time, p.task.endAt)} {p.task.customer.displayName}
                    </div>
                  ) : (
                    <Block
                      key={p.task.id}
                      placed={p}
                      style={style}
                      movable={planning && !p.startsBefore}
                      resizable={planning && !p.endsAfter}
                      dimmed={dragging?.id === p.task.id}
                      mechanic={employees.find((e) => e.id === p.task.mechanicId)}
                      serviceItemNames={serviceItemNames}
                      courtesyCar={courtesyCars?.get(p.task.id)}
                      onResizeStart={(e) => startResize(e, p.task)}
                      onResizeMove={(e) => moveResize(e, p.task)}
                      onResizeEnd={() => endResize(p.task)}
                      onResizeCancel={() => setResizing(null)}
                      onKeyResize={(e) => resizeByKey(e, p.task)}
                    />
                  )
                })}
                {ghost && (
                  <div
                    className={[styles.ghost, ghost.collides && styles.collides].filter(Boolean).join(' ')}
                    style={{ top: y(ghost.start), height: Math.max(y(ghost.end) - y(ghost.start), 14) }}
                    aria-hidden
                  >
                    {timeOf(ghost.start)}–{ghost.end >= DAY_MINUTES ? '24:00' : timeOf(ghost.end)}
                    {ghost.collides && ' · belegt'}
                  </div>
                )}
                {now !== null && now >= range.start && now <= range.end && (
                  <div className={styles.now} style={{ top: y(now) }} aria-hidden />
                )}
              </ColumnBody>
            )
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <TaskCard
            task={activeTask}
            mechanic={employees.find((e) => e.id === activeTask.mechanicId)}
            serviceItemNames={serviceItemNames}
            courtesyCar={courtesyCars?.get(activeTask.id)}
            className={styles.overlay}
            dragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )

  /** The outline of what is being dragged/created/picked in this column, if any */
  function ghostIn(column: DayColumn, placed: Placed[]): { start: number; end: number; collides: boolean } | null {
    const check = (start: number, end: number, exceptId?: string) =>
      ({ start, end, collides: column.liftId !== null && blockingIn(placed, start, end, exceptId) !== undefined })
    if (dragging && dragging.columnId === column.id) {
      const span = spanOn(byId.get(dragging.id)!, date)
      return check(dragging.start, Math.min(dragging.start + span.end - span.start, DAY_MINUTES), dragging.id)
    }
    if (creating && creating.held && creating.columnId === column.id) {
      const { time, endAt } = selection(date, creating.from, creating.to)
      return check(minutesOf(time), endAt.slice(0, 10) > date ? DAY_MINUTES : minutesOf(endAt.slice(11)))
    }
    if (picked && picked.date === date && picked.liftId === column.liftId) {
      return check(minutesOf(picked.time), picked.endAt.slice(0, 10) > date ? DAY_MINUTES : minutesOf(picked.endAt.slice(11)))
    }
    return null
  }
}

function chipTitle(task: Task): string {
  return [timeRange(task.date, task.time, task.endAt), task.customer.displayName, task.vehicle?.licensePlate, task.vehicle?.description]
    .filter(Boolean)
    .join(' · ')
}

function TimeAxis({ range, scale }: { range: { start: number; end: number }; scale: number }) {
  const hours = []
  for (let m = range.start; m < range.end; m += 60) hours.push(m)
  return (
    <div className={styles.axis} style={{ height: (range.end - range.start) * scale }}>
      {hours.map((m) => (
        <span key={m} className={styles.hour} style={{ top: (m - range.start) * scale }}>
          {timeOf(m)}
        </span>
      ))}
    </div>
  )
}

function ColumnBody({
  id,
  height,
  hourHeight,
  creatable,
  children,
  ...pointer
}: {
  id: string
  height: number
  hourHeight: number
  creatable: boolean
  children: ReactNode
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void
  onPointerCancel: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      data-grid-body
      className={[styles.body, creatable && styles.creatable, isOver && styles.over].filter(Boolean).join(' ')}
      style={{ height, '--hour': `${hourHeight}px` } as CSSProperties}
      // holding a finger on the grid opens a time, not the browser's menu
      onContextMenu={(e) => e.preventDefault()}
      {...pointer}
    >
      {children}
    </div>
  )
}

function Block({
  placed,
  style,
  movable,
  resizable,
  dimmed,
  mechanic,
  serviceItemNames,
  courtesyCar,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onResizeCancel,
  onKeyResize,
}: {
  placed: Placed
  style: CSSProperties
  movable: boolean
  resizable: boolean
  dimmed: boolean
  mechanic: Employee | undefined
  serviceItemNames: ReadonlyMap<string, string>
  courtesyCar: string | undefined
  onResizeStart: (e: PointerEvent<HTMLDivElement>) => void
  onResizeMove: (e: PointerEvent<HTMLDivElement>) => void
  onResizeEnd: () => void
  onResizeCancel: () => void
  onKeyResize: (e: KeyboardEvent) => boolean
}) {
  const { task } = placed
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id, disabled: !movable })
  return (
    <div
      ref={setNodeRef}
      className={[styles.block, placed.startsBefore && styles.startsBefore, placed.endsAfter && styles.endsAfter].filter(Boolean).join(' ')}
      style={{ ...style, opacity: dimmed ? 0.35 : undefined }}
    >
      <TaskCard
        task={task}
        mechanic={mechanic}
        serviceItemNames={serviceItemNames}
        courtesyCar={courtesyCar}
        className={[styles.card, movable && styles.movable].filter(Boolean).join(' ')}
        {...attributes}
        {...listeners}
        onKeyDown={(e) => {
          if (!onKeyResize(e)) listeners?.onKeyDown?.(e)
        }}
      />
      {resizable && (
        <div
          className={styles.handle}
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeCancel}
          title="Ziehen ändert das Ende"
          aria-hidden
        />
      )}
    </div>
  )
}
