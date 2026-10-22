import { CalendarPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { formatDate, formatTimestamp } from '../../../lib/format'
import { useAllEmployees } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { PARTS_STATUS, type AnyTask } from '../taskApi'
import { TaskStatusBadge } from '../TaskStatusBadge'
import { workSummary } from '../workSummary'
import { partsArrived, unplannedTotal } from './unplannedGroups'
import { useUnplanned } from './useUnplanned'
import styles from './UnplannedView.module.css'

/**
 * "Ohne Termin" (12d-3): orders that are taken but not planned – new ones without a day, and
 * planned ones taken out of the plan again (e.g. waiting for parts). The one waiting longest on
 * top, so nothing is forgotten. "Einplanen" opens the order to give it a day.
 * Orders waiting for parts are a group of their own (FB-15) – also those still on a day that is
 * over, where they would go under; the ones whose parts arrived first.
 */
export function UnplannedView() {
  const { data: groups, error } = useUnplanned()

  if (error) return <p className="muted">Aufträge konnten nicht geladen werden: {error.message}</p>
  if (!groups) return <p className="muted">Lade Aufträge …</p>
  if (unplannedTotal(groups) === 0) return <p className="muted">Kein Auftrag ohne Termin – alles ist eingeplant.</p>

  return (
    <div className={styles.groups}>
      {groups.waitingForParts.length > 0 && (
        <section aria-labelledby="waiting-title">
          <h2 id="waiting-title" className={styles.groupTitle}>
            Wartet auf Material
          </h2>
          <TaskList tasks={groups.waitingForParts} label="Aufträge, die auf Material warten" />
        </section>
      )}
      {groups.withoutAppointment.length > 0 && (
        <section aria-labelledby="unplanned-title">
          <h2 id="unplanned-title" className={styles.groupTitle}>
            Noch nicht eingeplant
          </h2>
          <TaskList tasks={groups.withoutAppointment} label="Aufträge ohne Termin" />
        </section>
      )}
    </div>
  )
}

function TaskList({ tasks, label }: { tasks: AnyTask[]; label: string }) {
  const { data: employees } = useAllEmployees()
  const { data: serviceItems } = useAllServiceItems()
  const canEdit = useCanEdit()
  const navigate = useNavigate()
  const names = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])

  return (
    <ul className={styles.list} aria-label={label}>
      {tasks.map((task) => {
        const mechanic = employees?.find((e) => e.id === task.mechanicId)
        const work = workSummary(task, names)
        const arrived = partsArrived(task)
        return (
          <li key={task.id} className={styles.item}>
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
            {task.status === 'WAITING_FOR_PARTS' && task.parts && (
              <p className={arrived ? styles.arrived : styles.missing}>
                {arrived ? '✓ Material angekommen – jetzt einplanen: ' : 'Fehlt: '}
                {task.parts.description}
              </p>
            )}
            <div className={styles.foot}>
              {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} />}
              {task.parts && <span className={styles.parts}>Material: {PARTS_STATUS[task.parts.status]}</span>}
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
