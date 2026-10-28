import { CalendarPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { formatDate, formatTimestamp } from '../../../lib/format'
import { useAllEmployees } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import type { AnyTask } from '../taskApi'
import { TaskStatusBadge } from '../TaskStatusBadge'
import { TaskVehicleLocation } from '../VehicleLocationSwitch'
import { workSummary } from '../workSummary'
import { byLocation, callInNow, locationFilterOf, unplannedTotal, type LocationFilter, type TaskParts } from './unplannedGroups'
import { useUnplanned } from './useUnplanned'
import styles from './UnplannedView.module.css'
import { PhoneLinks } from '../../../components/ui/PhoneLinks'
import { CallLog } from '../../customer-calls/CallLog'
import { useLatestCalls } from '../../customer-calls/customerCallApi'

/**
 * "Ohne Termin" (12d-3): orders that are taken but not planned – new ones without a day, and
 * planned ones taken out of the plan again (e.g. waiting for parts). The one waiting longest on
 * top, so nothing is forgotten. "Einplanen" opens the order to give it a day.
 * Orders waiting for parts are a group of their own (FB-15) – also those still on a day that is
 * over, where they would go under; the ones whose parts arrived first.
 * Where the vehicle is (FB-16): filtered "Beim Kunden – aufbieten | Bei uns", the phone number to tap
 * with those to call in, "Jetzt aufbieten" when nothing is missing any more.
 */
export function UnplannedView() {
  const { data: all, parts, error } = useUnplanned()
  const [params, setParams] = useSearchParams()
  const where = locationFilterOf(params.get('where'))

  if (error) return <p className="muted">Aufträge konnten nicht geladen werden: {error.message}</p>
  if (!all) return <p className="muted">Lade Aufträge …</p>
  if (unplannedTotal(all) === 0) return <p className="muted">Kein Auftrag ohne Termin – alles ist eingeplant.</p>

  const groups = byLocation(all, where)
  const filters: [LocationFilter, string][] = [
    ['all', 'Alle'],
    ['customer', `Beim Kunden – aufbieten (${unplannedTotal(byLocation(all, 'customer'))})`],
    ['workshop', `Bei uns (${unplannedTotal(byLocation(all, 'workshop'))})`],
  ]
  function show(filter: LocationFilter) {
    const next = new URLSearchParams(params)
    if (filter === 'all') next.delete('where')
    else next.set('where', filter)
    setParams(next, { replace: true })
  }

  return (
    <div className={styles.groups}>
      <div className={styles.filters} role="group" aria-label="Fahrzeug">
        {filters.map(([value, label]) => (
          <Button key={value} small variant={where === value ? 'primary' : 'secondary'} aria-pressed={where === value} onClick={() => show(value)}>
            {label}
          </Button>
        ))}
      </div>
      {unplannedTotal(groups) === 0 && <p className="muted">Keine Aufträge hier.</p>}
      {groups.waitingForParts.length > 0 && (
        <section aria-labelledby="waiting-title">
          <h2 id="waiting-title" className={styles.groupTitle}>
            Wartet auf Material
          </h2>
          <TaskList tasks={groups.waitingForParts} parts={parts} label="Aufträge, die auf Material warten" />
        </section>
      )}
      {groups.withoutAppointment.length > 0 && (
        <section aria-labelledby="unplanned-title">
          <h2 id="unplanned-title" className={styles.groupTitle}>
            Noch nicht eingeplant
          </h2>
          <TaskList tasks={groups.withoutAppointment} parts={parts} label="Aufträge ohne Termin" />
        </section>
      )}
    </div>
  )
}

function TaskList({ tasks, parts, label }: { tasks: AnyTask[]; parts: Map<string, TaskParts>; label: string }) {
  const { data: employees } = useAllEmployees()
  const { data: serviceItems } = useAllServiceItems()
  const canEdit = useCanEdit()
  const navigate = useNavigate()
  const names = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])
  // FB-16: who called whom – only those to call in
  const { data: calls } = useLatestCalls()

  return (
    <ul className={styles.list} aria-label={label}>
      {tasks.map((task) => {
        const mechanic = employees?.find((e) => e.id === task.mechanicId)
        const work = workSummary(task, names)
        const ofTask = parts.get(task.id)
        const atCustomer = task.vehicleLocation === 'AT_CUSTOMER'
        const callIn = callInNow(task, parts)
        return (
          <li key={task.id} className={callIn ? `${styles.item} ${styles.callIn}` : styles.item}>
            {callIn && <p className={styles.callInLabel}>Jetzt aufbieten</p>}
            <div className={styles.head}>
              <Link to={`/tasks/${task.id}`} className={styles.customer}>
                {task.customer.displayName}
              </Link>
              {task.taskNumber && <span className={styles.number}>{task.taskNumber}</span>}
              <TaskStatusBadge status={task.status} />
            </div>
            <div className={styles.vehicle}>
              {task.vehicle?.licensePlate && <LicensePlate text={task.vehicle.licensePlate} size="sm" />}
              {task.vehicle ? task.vehicle.description : <span className="muted">Fahrzeug offen</span>}
            </div>
            {work && <p className={styles.work}>{work}</p>}
            {/* its parts on the shopping list (FB-19): what is missing – or all here, plan it now */}
            {ofTask && (
              <p className={ofTask.arrived ? styles.arrived : styles.missing}>
                {ofTask.arrived ? '✓ Alle Teile geliefert – jetzt einplanen' : `Fehlt: ${ofTask.missing.join(', ')}`}
              </p>
            )}
            <div className={styles.foot}>
              <TaskVehicleLocation task={task} canEdit={canEdit} />
              {/* those to call in: the number right there, a tap on the tablet (FB-16) */}
              {atCustomer && <PhoneLinks mobile={task.customer.mobile} phone={task.customer.phone} />}
              {atCustomer && <CallLog customerId={task.customer.id} latest={calls?.get(task.customer.id)} canEdit={canEdit} />}
              {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} />}
              {task.date ? (
                <span className="muted">Termin war {formatDate(task.date)}</span>
              ) : (
                <span className="muted">erfasst {formatTimestamp(task.createdAt)}</span>
              )}
              {canEdit && (
                <span className={styles.action}>
                  <Button small variant="primary" icon={CalendarPlus} onClick={() => navigate(`/tasks/${task.id}/edit`)}>
                    Einplanen
                  </Button>
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
