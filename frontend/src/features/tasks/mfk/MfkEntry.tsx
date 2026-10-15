import { ClipboardCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import type { Employee } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import { useInspectionStations } from '../../inspection-stations/inspectionStationApi'
import styles from './MfkEntry.module.css'
import type { MfkSlot } from './mfkSlots'

/**
 * An MFK appointment in a calendar (FB-10): "MFK 10:00–11:00", customer, plate, station and who drives.
 * Dashed in the MFK color – a hint next to the task, not a task of its own. A click opens the task.
 *
 * `oneLine` (the dashboard's week): start, customer and driver only – the rest in the tooltip.
 */
export function MfkEntry({
  slot,
  driver,
  oneLine = false,
  className,
  style,
}: {
  slot: MfkSlot
  driver: Employee | undefined
  oneLine?: boolean
  className?: string
  style?: CSSProperties
}) {
  const { task } = slot
  const { data: stations } = useInspectionStations()
  const station = stations?.find((s) => s.id === task.mfkStationId)
  const period = `${slot.start}–${slot.end}`
  const plate = task.vehicle?.licensePlate
  const title = ['MFK', period, task.customer.displayName, plate, station?.name, driver && `fährt: ${driver.name}`]
    .filter(Boolean)
    .join(' · ')
  return (
    <Link
      to={`/tasks/${task.id}`}
      className={[styles.entry, oneLine && styles.oneLine, className].filter(Boolean).join(' ')}
      style={style}
      title={title}
    >
      <span className={styles.badge}>
        <ClipboardCheck aria-hidden /> MFK
      </span>
      <span className={styles.time}>{oneLine ? slot.start : period}</span>
      <span className={styles.customer}>{task.customer.displayName}</span>
      {!oneLine && plate && <span className={styles.plate}>{plate}</span>}
      {!oneLine && station && <span className={styles.station}>{station.name}</span>}
      {driver && (
        <span className={styles.driver}>
          <span className="visually-hidden">fährt: </span>
          <NameBadge name={driver.name} color={driver.color} />
        </span>
      )}
    </Link>
  )
}
