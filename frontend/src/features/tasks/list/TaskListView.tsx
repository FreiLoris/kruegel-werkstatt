import { ArrowDown, ArrowUp, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { Select, TextField } from '../../../components/ui/Fields'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate, todayIso } from '../../../lib/format'
import { useDebouncedValue } from '../../../lib/useDebouncedValue'
import { useAllEmployees } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { TASK_STATUS, useTasksBetween, type Task, type TaskStatus } from '../taskApi'
import { TaskStatusBadge } from '../TaskStatusBadge'
import { timeRange } from '../taskTime'
import { workSummary } from '../workSummary'
import {
  filterTasks,
  MAX_PERIOD_DAYS,
  periodDays,
  periodPresets,
  sortTasks,
  type SortDirection,
  type SortKey,
} from './taskList'
import styles from './TaskListView.module.css'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const STATUSES = Object.keys(TASK_STATUS) as TaskStatus[]
const OPEN: TaskStatus[] = ['RECEIVED', 'IN_PROGRESS', 'WAITING_FOR_PARTS']

const COLUMNS: { key: SortKey; title: string }[] = [
  { key: 'date', title: 'Termin' },
  { key: 'customer', title: 'Kunde' },
  { key: 'vehicle', title: 'Fahrzeug' },
  { key: 'mechanic', title: 'Mechaniker' },
  { key: 'lift', title: 'Lift' },
  { key: 'status', title: 'Status' },
  { key: 'taskNumber', title: 'Auftrags-Nr.' },
]

/**
 * All tasks of a period as a table (UI review): sortable columns, filters for period, status,
 * mechanic and text, the complete work (F1), status from the one definition (F10). The filters
 * are in the URL – a bookmark like "open this week" keeps them. No delete in the rows (misclick
 * danger): a row opens the task, deleting is there, with confirmation.
 */
export function TaskListView() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const today = todayIso()

  const from = valid(params.get('from')) ?? today
  const to = valid(params.get('to')) ?? addDays(today, 13)
  const statusParam = params.get('status') ?? ''
  // derived from the URL text, so it is the same array as long as the text stays the same
  const statuses = useMemo(() => statusParam.split(',').filter((s): s is TaskStatus => STATUSES.includes(s as TaskStatus)), [statusParam])
  const mechanicId = params.get('mechanic') ?? ''
  const sortKey = (COLUMNS.find((c) => c.key === params.get('sort'))?.key ?? 'date') as SortKey
  const direction: SortDirection = params.get('dir') === 'desc' ? 'desc' : 'asc'
  const qParam = params.get('q') ?? ''
  const [text, setText] = useState(qParam)
  const debouncedText = useDebouncedValue(text, 250)
  // Back button / bookmark changed the text in the URL → the field follows ("adjust state while rendering")
  const [syncedQ, setSyncedQ] = useState(qParam)
  if (qParam !== syncedQ) {
    setSyncedQ(qParam)
    if (qParam !== text.trim()) setText(qParam)
  }

  const days = periodDays({ from, to })
  const periodValid = days >= 1 && days <= MAX_PERIOD_DAYS
  const tasks = useTasksBetween(periodValid ? from : today, periodValid ? to : today)
  const { data: employees } = useAllEmployees()
  const { data: lifts } = useAllLifts()
  const { data: serviceItems } = useAllServiceItems()
  const names = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])

  /**
   * Changes some list parameters, keeps the rest (view=list, other filters).
   * `replace`: no new browser history entry (typing – otherwise "back" would go letter by letter).
   */
  function update(changes: Record<string, string | null>, replace = false) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace },
    )
  }

  // the work text once per task – used by the text filter and the table
  const workOf = useMemo(() => {
    const byId = new Map((tasks.data ?? []).map((task) => [task.id, workSummary(task, names)]))
    return (task: Task) => byId.get(task.id) ?? ''
  }, [tasks.data, names])

  const shown = useMemo(() => {
    if (!tasks.data || !employees || !lifts) return []
    const filtered = filterTasks(tasks.data, { statuses, mechanicId, text: debouncedText }, workOf)
    return sortTasks(filtered, sortKey, direction, { employees, lifts })
  }, [tasks.data, employees, lifts, statuses, mechanicId, debouncedText, workOf, sortKey, direction])

  /** A badge switches its status on or off; nothing chosen = all statuses are shown. */
  function toggleStatus(status: TaskStatus) {
    const shownNow = statuses.length === 0 ? STATUSES : statuses
    const next = shownNow.includes(status) ? shownNow.filter((s) => s !== status) : [...shownNow, status]
    update({ status: next.length === 0 || next.length === STATUSES.length ? null : next.join(',') })
  }

  function sortBy(key: SortKey) {
    update({ sort: key === 'date' ? null : key, dir: key === sortKey && direction === 'asc' ? 'desc' : null })
  }

  const onlyOpen = statuses.length === OPEN.length && OPEN.every((s) => statuses.includes(s))

  return (
    <div className={styles.list}>
      <div className={styles.filters}>
        <div className={styles.presets} role="group" aria-label="Zeitraum">
          {periodPresets(today).map((preset) => (
            <Button
              key={preset.label}
              small
              variant={preset.from === from && preset.to === to ? 'primary' : 'secondary'}
              onClick={() => update({ from: preset.from, to: preset.to })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className={styles.period}>
          <TextField label="Von" type="date" value={from} onChange={(e) => e.target.value && update({ from: e.target.value })} />
          <TextField
            label="Bis"
            type="date"
            value={to}
            onChange={(e) => e.target.value && update({ to: e.target.value })}
            error={periodValid ? undefined : `Zeitraum 1 bis ${MAX_PERIOD_DAYS} Tage`}
          />
          <Select label="Mechaniker" value={mechanicId} onChange={(e) => update({ mechanic: e.target.value || null })}>
            <option value="">alle</option>
            {(employees ?? [])
              .filter((e) => e.selectableAsMechanic || e.id === mechanicId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </Select>
          <TextField
            label="Filtern"
            type="search"
            placeholder="z. B. Huber oder ZH 123"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              update({ q: e.target.value.trim() || null }, true)
            }}
          />
        </div>
        <div className={styles.statuses} role="group" aria-label="Status">
          <Button small variant={onlyOpen ? 'primary' : 'secondary'} onClick={() => update({ status: onlyOpen ? null : OPEN.join(',') })}>
            Nur offene
          </Button>
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={[styles.statusToggle, (statuses.length === 0 || statuses.includes(status)) && styles.on].filter(Boolean).join(' ')}
              aria-pressed={statuses.length === 0 || statuses.includes(status)}
              onClick={() => toggleStatus(status)}
              title={`${TASK_STATUS[status]} ein-/ausblenden`}
            >
              <TaskStatusBadge status={status} />
            </button>
          ))}
        </div>
      </div>

      {!periodValid ? null : tasks.error ? (
        <p className="muted">Aufträge konnten nicht geladen werden: {tasks.error.message}</p>
      ) : !tasks.data || !employees || !lifts ? (
        <p className="muted">Lade Aufträge …</p>
      ) : (
        <>
          <p className={styles.count}>
            {shown.length === tasks.data.length
              ? `${shown.length} ${shown.length === 1 ? 'Auftrag' : 'Aufträge'}`
              : `${shown.length} von ${tasks.data.length} Aufträgen`}{' '}
            · {formatDate(from)} – {formatDate(to)}
          </p>
          {shown.length === 0 ? (
            <p className={styles.empty}>Keine Aufträge für diese Filter.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        aria-sort={column.key === sortKey ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button type="button" className={styles.sort} onClick={() => sortBy(column.key)}>
                          {column.title}
                          {column.key === sortKey && (direction === 'asc' ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />)}
                        </button>
                      </th>
                    ))}
                    <th>Arbeiten</th>
                    <th>
                      <span className="visually-hidden">Auftragszettel</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((task) => (
                    <Row
                      key={task.id}
                      task={task}
                      work={workOf(task)}
                      mechanic={employees.find((e) => e.id === task.mechanicId)}
                      liftName={lifts.find((l) => l.id === task.liftId)?.name}
                      onOpen={() => navigate(`/tasks/${task.id}`)}
                      onSheet={() => navigate(`/tasks/${task.id}/sheet`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Row({
  task,
  work,
  mechanic,
  liftName,
  onOpen,
  onSheet,
}: {
  task: Task
  work: string
  mechanic: { name: string; color: string } | undefined
  liftName: string | undefined
  onOpen: () => void
  onSheet: () => void
}) {
  return (
    // the whole row opens the task; the customer name is the real (keyboard) link
    <tr className={styles.row} onClick={onOpen}>
      <td className={styles.nowrap}>
        {WEEKDAYS_SHORT[weekdayOf(task.date)]} {formatDate(task.date)}
        <span className={styles.time}> {timeRange(task.date, task.time, task.endAt)}</span>
      </td>
      <td>
        <Link to={`/tasks/${task.id}`} onClick={(e) => e.stopPropagation()} className={styles.customer}>
          {task.customer.displayName}
        </Link>
      </td>
      <td>
        <span className={styles.vehicle}>
          {task.vehicle?.licensePlate && <LicensePlate text={task.vehicle.licensePlate} size="sm" />}
          {task.vehicle ? task.vehicle.description : <span className="muted">offen</span>}
        </span>
      </td>
      <td>{mechanic ? <NameBadge name={mechanic.name} color={mechanic.color} /> : <span className="muted">offen</span>}</td>
      <td className={styles.nowrap}>{liftName ?? <span className="muted">–</span>}</td>
      <td>
        <TaskStatusBadge status={task.status} />
      </td>
      {/* UI review: missing number once "—", once "(noch keine)" → always "offen", visible */}
      <td className={styles.nowrap}>{task.taskNumber ?? <span className={styles.open}>offen</span>}</td>
      <td className={styles.work}>{work || <span className="muted">–</span>}</td>
      <td>
        <button
          type="button"
          className={styles.icon}
          onClick={(e) => {
            e.stopPropagation()
            onSheet()
          }}
          aria-label={`Auftragszettel ${task.customer.displayName}`}
          title="Auftragszettel"
        >
          <Printer aria-hidden />
        </button>
      </td>
    </tr>
  )
}

function valid(date: string | null): string | null {
  return date && ISO_DATE.test(date) ? date : null
}
