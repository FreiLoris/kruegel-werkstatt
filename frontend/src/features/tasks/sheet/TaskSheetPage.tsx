import { ArrowLeft, Printer } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { formatLocalDateTime } from '../../../lib/format'
import { useTaskBookings } from '../../bookings/bookingApi'
import { useCompany } from '../../company/companyApi'
import { useAllCourtesyCars } from '../../courtesy-cars/courtesyCarApi'
import { useAllEmployees } from '../../employees/employeeApi'
import { useInspectionStations } from '../../inspection-stations/inspectionStationApi'
import { useInsurances } from '../../insurances/insuranceApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { useTaskTires } from '../../tire-hotel/tireHotelApi'
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
  const employeeList = useAllEmployees()
  const liftList = useAllLifts()
  const serviceItemList = useAllServiceItems()
  const bookings = useTaskBookings(id ?? '')
  const carList = useAllCourtesyCars()
  const insuranceList = useInsurances()
  const stationList = useInspectionStations()
  const tireChange = !!task.data?.tireChange
  const tires = useTaskTires(id, tireChange)
  const employees = employeeList.data
  const lifts = liftList.data
  const serviceItems = serviceItemList.data
  const cars = carList.data
  const insurances = insuranceList.data
  const stations = stationList.data

  const serviceItemNames = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])

  // all lists loaded – otherwise a quick print would say "Mechaniker: noch offen" although one is assigned
  const ready = task.data && company.data && serviceItems && employees && lifts && bookings.data && cars && insurances && stations && (!tireChange || tires.data)
  // any list that could not be loaded at all – otherwise the page would wait forever; a failed
  // background refetch keeps the sheet that is shown
  const lists = [task, company, employeeList, liftList, serviceItemList, bookings, carList, insuranceList, stationList, ...(tireChange ? [tires] : [])]
  const error = lists.find((list) => list.error && !list.data)?.error
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
        {/* back where the sheet was opened from – the task (UX M-11) */}
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(id ? `/tasks/${id}` : '/tasks')}>
          Zum Auftrag
        </Button>
        <Button variant="primary" icon={Printer} disabled={!ready} onClick={() => window.print()}>
          Drucken
        </Button>
      </div>
      {!ready && error ? (
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
            acceptedByName: employees?.find((e) => e.id === task.data.acceptedById)?.name,
            liftName: lifts?.find((l) => l.id === task.data.liftId)?.name,
            courtesyCar,
            insurance: insurances?.find((i) => i.id === task.data.insuranceId),
            mfkStation: stations?.find((s) => s.id === task.data.mfkStationId),
            mfkDriverName: employees?.find((e) => e.id === task.data.mfkDriverId)?.name,
            tires: tires.data,
          }}
        />
      )}
    </div>
  )
}
