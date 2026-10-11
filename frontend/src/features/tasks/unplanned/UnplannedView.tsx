import { CalendarPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { formatTimestamp } from '../../../lib/format'
import { useAllEmployees } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { PARTS_STATUS, useTasksWithoutAppointment } from '../taskApi'
import { TaskStatusBadge } from '../TaskStatusBadge'
import { workSummary } from '../workSummary'
import styles from './UnplannedView.module.css'

/**
 * "Ohne Termin" (12d-3): orders that are taken but not planned – new ones without a day, and
 * planned ones taken out of the plan again (e.g. waiting for parts). The one waiting longest on
 * top, so nothing is forgotten. "Einplanen" opens the order to give it a day.
 */
export function UnplannedView() {
  const tasks = useTasksWithoutAppointment()
  const { data: employees } = useAllEmployees()
  const { data: serviceItems } = useAllServiceItems()
  const canEdit = useCanEdit()
  const navigate = useNavigate()
  const names = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])

  if (tasks.error) return <p className="muted">Aufträge konnten nicht geladen werden: {tasks.error.message}</p>
  if (!tasks.data) return <p className="muted">Lade Aufträge …</p>
  if (tasks.data.length === 0) return <p className="muted">Kein Auftrag ohne Termin – alles ist eingeplant.</p>

  return (
    <ul className={styles.list} aria-label="Aufträge ohne Termin">
      {tasks.data.map((task) => {
        const mechanic = employees?.find((e) => e.id === task.mechanicId)
        const work = workSummary(task, names)
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
            <div className={styles.foot}>
              {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} />}
              {task.parts && <span className={styles.parts}>Material: {PARTS_STATUS[task.parts.status]}</span>}
              <span className="muted">erfasst {formatTimestamp(task.createdAt)}</span>
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
