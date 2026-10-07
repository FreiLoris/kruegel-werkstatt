import { ArrowDown, ArrowUp, CalendarDays, List, Pencil, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { formatDate } from '../../lib/format'
import { moved } from '../../lib/sortOrder'
import { AbsenceCalendarView } from '../absences/AbsenceCalendarView'
import { ROLES, useAllEmployees, useReorderEmployees, useSetEmployeeActive, type Employee } from './employeeApi'
import { EmployeeDialog } from './EmployeeDialog'
import styles from './EmployeesPage.module.css'
import { NameBadge } from './NameBadge'

/** Which dialog is open: none, "new" or a specific person */
type Dialog = { kind: 'new' } | { kind: 'edit'; employee: Employee } | null

type View = 'calendar' | 'list'
const VIEWS: { view: View; label: string; icon: typeof List }[] = [
  { view: 'calendar', label: 'Kalender', icon: CalendarDays },
  { view: 'list', label: 'Liste', icon: List },
]

/**
 * The employees: the calendar of who is away when (9b, as in the old app the first view) and the
 * list to manage them. The view stands in the address (`view=list`).
 */
export function EmployeesPage() {
  const [params, setParams] = useSearchParams()
  const view: View = params.get('view') === 'list' ? 'list' : 'calendar'

  return (
    // the calendar uses the whole screen width (AppLayout: data-wide)
    <div data-wide={view === 'calendar' ? '' : undefined}>
      <div className={styles.header}>
        <h1>Mitarbeiter</h1>
        <div className={styles.views} role="group" aria-label="Ansicht">
          {VIEWS.map(({ view: v, label, icon }) => (
            <Button
              key={v}
              icon={icon}
              variant={view === v ? 'primary' : 'secondary'}
              aria-pressed={view === v}
              // the month belongs to the calendar – the list starts without it
              onClick={() => setParams(v === 'list' ? { view: 'list' } : {}, { replace: true })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      {view === 'calendar' ? <AbsenceCalendarView /> : <EmployeeList />}
    </div>
  )
}

/**
 * Administration of the employees: list in fixed order (= order on the pinboard and in
 * selection lists), create/edit in a dialog, former employees separately.
 */
function EmployeeList() {
  const { data: all, error, isPending, refetch } = useAllEmployees()
  const [dialog, setDialog] = useState<Dialog>(null)
  const canEdit = useCanEdit()

  if (isPending) {
    return <p className="muted">Lade Mitarbeiter …</p>
  }
  if (error) {
    return (
      <>
        <p className={styles.error}>Mitarbeiter konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  const active = all.filter((e) => e.active)
  const former = all.filter((e) => !e.active)

  return (
    <>
      <div className={styles.listHeader}>
        <p className="muted">Die Reihenfolge gilt überall – Pinnwand-Spalten, Auswahllisten, Kalender.</p>
        {canEdit && (
          <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'new' })}>
            Neuer Mitarbeiter
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <p className={styles.empty}>Noch niemand erfasst. Mit «Neuer Mitarbeiter» die erste Person anlegen.</p>
      ) : (
        <ActiveList active={active} canEdit={canEdit} onEdit={(employee) => setDialog({ kind: 'edit', employee })} />
      )}

      {former.length > 0 && <FormerEmployees former={former} canEdit={canEdit} />}

      {dialog && (
        <EmployeeDialog
          key={dialog.kind === 'new' ? 'new' : dialog.employee.id}
          employee={dialog.kind === 'edit' ? dialog.employee : undefined}
          all={all}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}

function ActiveList({ active, canEdit, onEdit }: {
  active: Employee[]
  /** No in view-only mode: table without buttons */
  canEdit: boolean
  onEdit: (e: Employee) => void
}) {
  const reorder = useReorderEmployees()
  const toast = useToast()

  function move(index: number, direction: -1 | 1) {
    reorder.mutate(moved(active.map((e) => e.id), index, direction), {
      onError: (error) => toast.error(`Reihenfolge nicht gespeichert: ${error.message}`),
    })
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Rolle</th>
            <th>Geburtstag</th>
            <th>Ferien</th>
            <th>Erscheint bei</th>
            {canEdit && (
              <th>
                <span className={styles.srOnly}>Aktionen</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {active.map((e, index) => (
            <tr key={e.id}>
              <td>
                <NameBadge name={e.name} color={e.color} />
              </td>
              <td>{ROLES[e.role]}</td>
              <td>{e.birthday ? formatDate(e.birthday) : <span className="muted">–</span>}</td>
              <td>{e.vacationDaysPerYear} Tage</td>
              <td>
                <AppearsIn employee={e} />
              </td>
              {canEdit && (
                <td className={styles.actions}>
                  <Button
                    variant="ghost"
                    icon={ArrowUp}
                    aria-label={`${e.name} nach oben`}
                    title="Nach oben"
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                  />
                  <Button
                    variant="ghost"
                    icon={ArrowDown}
                    aria-label={`${e.name} nach unten`}
                    title="Nach unten"
                    disabled={index === active.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                  />
                  <Button icon={Pencil} onClick={() => onEdit(e)} aria-label={`${e.name} bearbeiten`}>
                    Bearbeiten
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AppearsIn({ employee }: { employee: Employee }) {
  const areas = [
    employee.selectableAsMechanic && 'Termine',
    employee.selectableForTodos && 'To-dos & Notizen',
    employee.hasPinboardColumn && 'Pinnwand',
  ].filter(Boolean)

  if (areas.length === 0) {
    return <span className="muted">nirgends</span>
  }
  return (
    <ul className={styles.chips}>
      {areas.map((area) => (
        <li key={String(area)} className={styles.chip}>
          {area}
        </li>
      ))}
    </ul>
  )
}

/** People no longer in the business – collapsed because rarely needed. */
function FormerEmployees({ former, canEdit }: { former: Employee[]; canEdit: boolean }) {
  const setActive = useSetEmployeeActive()
  const toast = useToast()

  function activate(e: Employee) {
    setActive.mutate(
      { id: e.id, active: true },
      {
        onSuccess: () => toast.success(`${e.name} ist wieder aktiv`),
        // e.g. the name was given to another active person in the meantime
        onError: (error) => toast.error(`${e.name} konnte nicht aktiviert werden: ${error.message}`),
      },
    )
  }

  return (
    <details className={styles.former}>
      <summary>Ehemalige ({former.length})</summary>
      <ul className={styles.formerList}>
        {former.map((e) => (
          <li key={e.id}>
            <NameBadge name={e.name} color={e.color} />
            <span className="muted">{ROLES[e.role]}</span>
            {canEdit && (
              <Button small icon={RotateCcw} onClick={() => activate(e)} disabled={setActive.isPending}>
                Wieder aktivieren
              </Button>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
