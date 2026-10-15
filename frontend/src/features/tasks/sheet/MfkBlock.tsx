import { formatDuration, formatLocalDateTime } from '../../../lib/format'
import { Block, WriteIn } from './SheetParts'
import styles from './TaskSheet.module.css'

/**
 * The MFK (FB-10): where, when and who drives – the address and phone of the station for the driver.
 * The appointment is printed when known, else a line to write it on. Kept short (one or two lines),
 * so the sheet stays on one page also with a tire change.
 */
export function MfkBlock({
  station,
  appointment,
  minutes,
  driverName,
}: {
  station?: { name: string; address: string | null; phone: string | null }
  appointment: string | null
  minutes: number | null
  driverName?: string
}) {
  return (
    <Block title="MFK">
      <p className={styles.inline}>
        <strong>{station?.name ?? 'Prüfstelle: –'}</strong>
        {station?.address && <span>{station.address}</span>}
        {station?.phone && <span>Tel. {station.phone}</span>}
      </p>
      <p className={styles.inline}>
        <span>
          Termin: {appointment ? <strong>{formatLocalDateTime(appointment)}</strong> : <WriteIn />}
          {minutes !== null && ` (${formatDuration(minutes)} inkl. Fahrt)`}
        </span>
        <span>Fährt: {driverName ?? <WriteIn />}</span>
      </p>
    </Block>
  )
}
