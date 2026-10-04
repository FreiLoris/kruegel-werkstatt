import { useMemo } from 'react'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { formatDate } from '../../../lib/format'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { TASK_STATUS, useCustomerHistory } from '../taskApi'
import { workSummary } from '../workSummary'
import styles from './CustomerHistory.module.css'

/** The customer's last tasks – what was done last time, which car came (UI review: no empty area). */
export function CustomerHistory({ customerId }: { customerId: string }) {
  const history = useCustomerHistory(customerId)
  const { data: serviceItems } = useAllServiceItems()
  const names = useMemo(() => new Map((serviceItems ?? []).map((item) => [item.id, item.name])), [serviceItems])

  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className={styles.heading}>
        Bisherige Aufträge
      </h2>
      {history.isPending ? (
        <p className="muted">Lade …</p>
      ) : history.error ? (
        <p className="muted">Konnte nicht geladen werden: {history.error.message}</p>
      ) : history.data.length === 0 ? (
        <p className="muted">Noch keine Aufträge in der App.</p>
      ) : (
        <ol className={styles.list}>
          {history.data.map((task) => (
            <li key={task.id} className={styles.item}>
              <div className={styles.line}>
                <span className={styles.date}>{formatDate(task.date)}</span>
                <span className={styles.status}>{TASK_STATUS[task.status]}</span>
              </div>
              <div className={styles.line}>
                {task.vehicle?.licensePlate ? (
                  <LicensePlate text={task.vehicle.licensePlate} size="sm" />
                ) : (
                  <span className="muted">{task.vehicle ? 'ohne Kennzeichen' : 'Fahrzeug offen'}</span>
                )}
                {task.vehicle && <span>{task.vehicle.description}</span>}
              </div>
              <p className={styles.work}>{workSummary(task, names) || '–'}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
