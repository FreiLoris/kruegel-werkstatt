import { ArrowLeft, Printer } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { formatLocalDateTime } from '../../../lib/format'
import { useTaskBookings } from '../../bookings/bookingApi'
import { useCompany } from '../../company/companyApi'
import { useAllCourtesyCars } from '../../courtesy-cars/courtesyCarApi'
import { useAllEmployees } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { useTask } from '../taskApi'
import { TaskSheet } from './TaskSheet'
import styles from './TaskSheetPage.module.css'

/**
 * Print view of a task sheet – outside the app frame, so only the paper is printed.
 * On screen: grey desk with the white A4 sheet and a toolbar (hidden when printing).
 */
export function TaskSheetPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const task = useTask(id)
  const company = useCompany()
  const { data: employees } = useAllEmployees()
  const { data: lifts } = useAllLifts()
  const { data: serviceItems } = useAllServiceItems()
  const bookings = useTaskBookings(id ?? '')
  const { data: cars } = useAllCourtesyCars()

  const serviceItemNames = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])

  const error = task.error ?? company.error
  // all lists loaded – otherwise a quick print would say "Mechaniker: noch offen" although one is assigned
  const ready = task.data && company.data && serviceItems && employees && lifts && bookings.data && cars
  // the car still out (or not yet picked up) – a returned one is history, not for the mechanic
  const booking = bookings.data?.find((b) => !b.returnedAt)
  const car = booking && cars?.find((c) => c.id === booking.courtesyCarId)
  const courtesyCar =
    booking && car
      ? `${car.name}${car.model || car.licensePlate ? ` (${[car.model, car.licensePlate].filter(Boolean).join(', ')})` : ''}, ` +
        `${formatLocalDateTime(booking.pickupAt)} – ${formatLocalDateTime(booking.returnAt)}`
      : undefined

  return (
    <div className={styles.desk}>
      <div className={styles.toolbar}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/')}>
          Zur App
        </Button>
        <Button variant="primary" icon={Printer} disabled={!ready} onClick={() => window.print()}>
          Drucken
        </Button>
      </div>
      {error ? (
        <p className={styles.message}>Auftrag konnte nicht geladen werden: {error.message}</p>
      ) : !ready ? (
        <p className={styles.message}>Lade Auftragszettel …</p>
      ) : (
        <TaskSheet
          task={task.data}
          company={company.data}
          lookups={{
            serviceItemNames,
            mechanicName: employees?.find((e) => e.id === task.data.mechanicId)?.name,
            liftName: lifts?.find((l) => l.id === task.data.liftId)?.name,
            courtesyCar,
          }}
        />
      )}
    </div>
  )
}
