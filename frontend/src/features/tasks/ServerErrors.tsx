import type { FieldError } from '../../api/errors'
import styles from './ServerErrors.module.css'

/** Field names of the backend → words the user knows from the task form */
const FIELD_LABELS: Record<string, string> = {
  customerId: 'Kunde',
  vehicleId: 'Fahrzeug',
  date: 'Datum',
  time: 'Uhrzeit',
  endAt: 'Ende',
  arrivesEarlier: 'Kommt früher',
  readyBy: 'Fertig bis',
  mechanicId: 'Mechaniker',
  liftId: 'Lift',
  tireChangeKind: 'Radwechsel',
  mfkAppointment: 'MFK-Termin',
  serviceItemIds: 'Service',
  'parts.description': 'Material',
  'parts.status': 'Material-Status',
  'parts.supplier': 'Lieferant',
  workDescription: 'Weitere Arbeiten',
  notes: 'Notizen',
  taskNumber: 'Auftragsnummer',
  version: 'Version',
  'courtesyCar.courtesyCarId': 'Ersatzwagen',
  'courtesyCar.pickupAt': 'Abholung Ersatzwagen',
  'courtesyCar.returnAt': 'Rückgabe Ersatzwagen',
  'courtesyCar.notes': 'Notiz Ersatzwagen',
}

/** Why the server refused to save a task – in words (e.g. the mechanic was deactivated meanwhile). */
export function ServerErrors({ errors }: { errors: FieldError[] }) {
  if (errors.length === 0) return null
  return (
    <div className={styles.errors} role="alert">
      <p>Der Auftrag konnte nicht gespeichert werden:</p>
      <ul>
        {errors.map((e) => (
          <li key={e.field + e.message}>
            {/* field "" = a rule about the whole save, e.g. the courtesy car was taken meanwhile */}
            {e.field ? `${FIELD_LABELS[e.field] ?? e.field}: ` : ''}
            {e.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
