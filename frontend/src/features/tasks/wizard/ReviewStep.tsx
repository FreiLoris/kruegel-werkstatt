import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import type { FieldError } from '../../../api/errors'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { formatDate, formatLocalDateTime } from '../../../lib/format'
import { useActiveEmployees } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { workItems } from '../workSummary'
import type { AppointmentForm } from './appointmentForm'
import styles from './ReviewStep.module.css'
import type { CustomerStepValue } from './wizardState'

/** Field names of the backend → words the user knows from the form */
const FIELD_LABELS: Record<string, string> = {
  customerId: 'Kunde',
  vehicleId: 'Fahrzeug',
  date: 'Datum',
  time: 'Uhrzeit',
  arrivesEarlier: 'Kommt früher',
  readyBy: 'Fertig bis',
  mechanicId: 'Mechaniker',
  liftId: 'Lift',
  tireChangeKind: 'Radwechsel',
  mfkAppointment: 'MFK-Termin',
  serviceItemIds: 'Service',
  'parts.description': 'Material',
  'parts.supplier': 'Lieferant',
  workDescription: 'Weitere Arbeiten',
  notes: 'Notizen',
}

interface ReviewStepProps {
  customerStep: CustomerStepValue
  appointment: AppointmentForm
  onEdit: (step: 1 | 2) => void
  /** Field errors of a failed save – shown on top in words */
  serverErrors: FieldError[]
}

/** Wizard step 3: everything once more in words before it is saved – each block can be changed. */
export function ReviewStep({ customerStep, appointment: f, onEdit, serverErrors }: ReviewStepProps) {
  const { data: employees } = useActiveEmployees()
  const { data: lifts } = useAllLifts()
  const { data: serviceItems } = useAllServiceItems()

  const customer = customerStep.customer!
  const vehicle = customerStep.vehicle?.kind === 'vehicle' ? customerStep.vehicle.vehicle : null
  const items = workItems(
    {
      tireChange: f.tireChange,
      tireChangeKind: f.tireChangeKind || null,
      mfk: f.mfk,
      mfkAppointment: f.mfk && f.mfkDate && f.mfkTime ? `${f.mfkDate}T${f.mfkTime}` : null,
      serviceItemIds: (serviceItems ?? []).filter((s) => f.serviceItemIds.includes(s.id)).map((s) => s.id),
      parts: f.parts
        ? { description: f.partsDescription.trim(), status: f.partsStatus, supplier: f.partsSupplier.trim() || null, orderedOn: f.partsOrderedOn || null }
        : null,
    },
    new Map((serviceItems ?? []).map((s) => [s.id, s.name])),
  )
  const address = [customer.street, [customer.postalCode, customer.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <div className={styles.review}>
      {serverErrors.length > 0 && (
        <div className={styles.errors} role="alert">
          <p>Der Auftrag konnte nicht gespeichert werden:</p>
          <ul>
            {serverErrors.map((e) => (
              <li key={e.field + e.message}>
                {FIELD_LABELS[e.field] ?? e.field}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Block title="Kunde & Fahrzeug" onEdit={() => onEdit(1)}>
        <p className={styles.strong}>{customer.displayName}</p>
        {address && <p>{address}</p>}
        {(customer.mobile ?? customer.phone) && <p>{customer.mobile ?? customer.phone}</p>}
        <p className={styles.vehicle}>
          {vehicle ? (
            <>
              {vehicle.licensePlate && <LicensePlate text={vehicle.licensePlate} size="sm" />}
              <span>{vehicle.description}</span>
            </>
          ) : (
            <span className="muted">Fahrzeug noch offen</span>
          )}
        </p>
      </Block>

      <Block title="Termin" onEdit={() => onEdit(2)}>
        <p className={styles.strong}>
          {WEEKDAYS_SHORT[weekdayOf(f.date)]} {formatDate(f.date)}, {f.time}
        </p>
        <Facts
          rows={[
            ['Kommt früher', f.arrivesEarlier ? formatLocalDateTime(`${f.arrivesEarlierDate}T${f.arrivesEarlierTime}`) : null],
            ['Fertig bis', f.readyBy ? formatLocalDateTime(`${f.readyByDate}T${f.readyByTime}`) : null],
            ['Wartekunde', f.waitingCustomer ? 'Ja' : null],
            ['Mechaniker', employees?.find((e) => e.id === f.mechanicId)?.name ?? 'noch offen'],
            ['Lift', lifts?.find((l) => l.id === f.liftId)?.name ?? 'noch offen'],
          ]}
        />
      </Block>

      <Block title="Arbeiten" onEdit={() => onEdit(2)}>
        {items.length === 0 && !f.workDescription.trim() ? (
          <p className="muted">Keine Arbeiten angegeben.</p>
        ) : (
          <ul className={styles.items}>
            {items.map((item) => (
              <li key={item.label}>
                {item.label}
                {item.detail && <span className="muted"> – {item.detail}</span>}
              </li>
            ))}
          </ul>
        )}
        {f.workDescription.trim() && <p className={styles.freeText}>{f.workDescription.trim()}</p>}
        {f.notes.trim() && (
          <p className={styles.freeText}>
            <span className="muted">Notizen: </span>
            {f.notes.trim()}
          </p>
        )}
      </Block>
    </div>
  )
}

function Block({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className={styles.block}>
      <div className={styles.blockHeader}>
        <h2>{title}</h2>
        <Button variant="ghost" small icon={Pencil} onClick={onEdit}>
          ändern
        </Button>
      </div>
      {children}
    </section>
  )
}

function Facts({ rows }: { rows: [string, string | null][] }) {
  return (
    <dl className={styles.facts}>
      {rows
        .filter((row): row is [string, string] => row[1] !== null)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  )
}
