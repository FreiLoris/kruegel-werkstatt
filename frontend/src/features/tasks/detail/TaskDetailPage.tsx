import { ArrowLeft, CalendarX, CircleDot, Mail, Pencil, Phone, Printer, Smartphone, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../../../api/errors'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { useConfirm } from '../../../components/ui/confirmContext'
import { Facts } from '../../../components/ui/Facts'
import { useToast } from '../../../components/ui/toastContext'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { formatCount, formatDate, formatDuration, formatLocalDateTime, formatTime, formatTimestamp } from '../../../lib/format'
import { CourtesyCarPanel } from '../../bookings/CourtesyCarPanel'
import { CustomerDialog } from '../../customers/CustomerDialog'
import { useAllEmployees, type Employee } from '../../employees/employeeApi'
import { useInspectionStations } from '../../inspection-stations/inspectionStationApi'
import { NameBadge } from '../../employees/NameBadge'
import { useInsurances } from '../../insurances/insuranceApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { TaskPinboard } from '../../notes/TaskPinboard'
import { isBooked } from '../../tire-hotel/taskTires'
import { TaskTiresPanel } from '../../tire-hotel/TaskTiresPanel'
import { useTaskTires } from '../../tire-hotel/tireHotelApi'
import { MfkHint } from '../../vehicles/MfkHint'
import { VehicleDialog } from '../../vehicles/VehicleDialog'
import { isPlanned, TASK_STATUS, useChangeTaskStatus, useDeleteTask, useRemoveAppointment, useTask, type AnyTask, type TaskStatus } from '../taskApi'
import { TaskStatusBadge } from '../TaskStatusBadge'
import { TIME_OPEN, timeRange, whenLabel } from '../taskTime'
import { workItems } from '../workSummary'
import styles from './TaskDetailPage.module.css'
import { TaskNumberEditor } from './TaskNumberEditor'

/**
 * A task as readable text (UI review: the old view looked like a form but nothing could be typed).
 * Everyday actions right here: status, task number, sheet, customer/vehicle data, edit, delete.
 */
export function TaskDetailPage() {
  const { id } = useParams()
  const task = useTask(id)

  // the data wins over a failed background refetch (Wi-Fi gap) – open dialogs keep their input;
  // only "not found" (deleted on another device) replaces the page
  const deleted = task.error instanceof ApiError && task.error.problem.status === 404
  if (!task.data || deleted) {
    return <p className="muted">{task.error ? `Auftrag konnte nicht geladen werden: ${task.error.message}` : 'Lade Auftrag …'}</p>
  }
  return <TaskDetail task={task.data} />
}

function TaskDetail({ task }: { task: AnyTask }) {
  const navigate = useNavigate()
  const canEdit = useCanEdit()
  const confirm = useConfirm()
  const toast = useToast()
  const changeStatus = useChangeTaskStatus()
  const remove = useDeleteTask()
  const removeAppointment = useRemoveAppointment()
  const { data: employees } = useAllEmployees()
  const { data: lifts } = useAllLifts()
  const { data: serviceItems } = useAllServiceItems()
  const { data: stations } = useInspectionStations()
  const [dialog, setDialog] = useState<'customer' | 'vehicle' | null>(null)
  const tires = useTaskTires(task.id, task.tireChange)
  const fromHotel = task.tireChangeKind === 'WHEELS_STORED' || task.tireChangeKind === 'TIRES_STORED'

  const names = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])
  const employee = (id: string | null) => employees?.find((e) => e.id === id)
  // an order without appointment came from its list, not from a day
  const backToDay = () => navigate(task.date ? `/tasks?date=${task.date}` : '/tasks?view=unplanned')
  const c = task.customer
  const v = task.vehicle
  const items = workItems(task, names)
  const mfkStation = stations?.find((s) => s.id === task.mfkStationId)

  async function setStatus(status: TaskStatus) {
    // done, but the wheels of the hotel are not booked out: the place would still show them (13q)
    const book =
      status === 'DONE' &&
      fromHotel &&
      tires.data &&
      !isBooked(tires.data) &&
      (await confirm({
        title: 'Radwechsel im Pneuhotel buchen?',
        text: 'Der Auftrag wird fertig gemeldet. Die Räder sind im Pneuhotel noch nicht ausgelagert – jetzt mit den Profiltiefen vom Auftragszettel buchen?',
        confirmLabel: 'Jetzt buchen',
        cancelLabel: 'Später',
      }))
    changeStatus.mutate(
      { id: task.id, status },
      {
        // only once the status is saved – a failed change must not lead on (and its toast would be lost)
        onSuccess: () => {
          if (book) navigate(`/tasks/${task.id}/tires`)
        },
        onError: (error) => toast.error(`Status konnte nicht geändert werden: ${error.message}`),
      },
    )
  }

  async function deleteTask() {
    const ok = await confirm({
      title: 'Auftrag löschen?',
      text: `${c.displayName}, ${whenLabel(task, true)} wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.`,
      confirmLabel: 'Löschen',
      dangerous: true,
    })
    if (!ok) return
    remove.mutate(task.id, {
      onSuccess: () => {
        toast.success('Auftrag gelöscht')
        backToDay()
      },
      onError: (error) => toast.error(`Löschen fehlgeschlagen: ${error.message}`),
    })
  }

  /** Out of the plan, e.g. the parts are not here: the order stays, day and lift are free for others. */
  async function takeOutOfPlan() {
    const ok = await confirm({
      title: 'Aus der Planung nehmen?',
      text: `${c.displayName}, ${whenLabel(task, true)}: Tag, Uhrzeit und Lift werden frei. Der Auftrag bleibt und steht unter «Ohne Termin», bis er neu eingeplant wird. Ein gebuchter Ersatzwagen bleibt gebucht.`,
      confirmLabel: 'Aus der Planung nehmen',
    })
    if (!ok) return
    removeAppointment.mutate(task.id, {
      onSuccess: () => toast.success('Auftrag steht jetzt unter «Ohne Termin»'),
      onError: (error) => toast.error(`Nicht gespeichert: ${error.message}`),
    })
  }

  return (
    <>
      <Button variant="ghost" icon={ArrowLeft} onClick={backToDay}>
        {task.date ? `Zu den Terminen vom ${formatDate(task.date)}` : 'Zu den Aufträgen ohne Termin'}
      </Button>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{c.displayName}</h1>
          <p className={styles.when}>
            {isPlanned(task)
              ? `${WEEKDAYS_SHORT[weekdayOf(task.date)]} ${formatDate(task.date)}, ${task.timeOpen ? TIME_OPEN : `${formatTime(task.time)} Uhr`}`
              : 'Ohne Termin'}
            <TaskStatusBadge status={task.status} />
          </p>
        </div>
        <div className={styles.actions}>
          <Button icon={Printer} onClick={() => navigate(`/tasks/${task.id}/sheet`)}>
            Auftragszettel
          </Button>
          {canEdit && (
            <>
              <Button variant="primary" icon={Pencil} onClick={() => navigate(`/tasks/${task.id}/edit`)}>
                {task.date ? 'Bearbeiten' : 'Einplanen / Bearbeiten'}
              </Button>
              {task.date && (
                <Button icon={CalendarX} onClick={takeOutOfPlan} loading={removeAppointment.isPending}>
                  Aus Planung nehmen
                </Button>
              )}
              <Button variant="ghost" icon={Trash2} onClick={deleteTask} loading={remove.isPending}>
                Löschen
              </Button>
            </>
          )}
        </div>
      </div>

      {canEdit && (
        <div className={styles.status} role="group" aria-label="Status ändern">
          {(Object.keys(TASK_STATUS) as TaskStatus[]).map((status) => (
            <Button
              key={status}
              small
              variant={task.status === status ? 'primary' : 'secondary'}
              aria-pressed={task.status === status}
              disabled={changeStatus.isPending}
              onClick={() => task.status !== status && setStatus(status)}
            >
              {TASK_STATUS[status]}
            </Button>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        <Card
          title="Kunde"
          action={
            canEdit && (
              <EditDataButton
                local={c.editable}
                label="Kundendaten ändern"
                onClick={() => setDialog('customer')}
              />
            )
          }
        >
          {[c.addition, c.street, [c.postalCode, c.city].filter(Boolean).join(' ')].filter(Boolean).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <ul className={styles.contact}>
            {c.mobile && (
              <li>
                <Smartphone aria-hidden /> <a href={`tel:${c.mobile}`}>{c.mobile}</a>
              </li>
            )}
            {c.phone && (
              <li>
                <Phone aria-hidden /> <a href={`tel:${c.phone}`}>{c.phone}</a>
              </li>
            )}
            {c.email && (
              <li>
                <Mail aria-hidden /> <a href={`mailto:${c.email}`}>{c.email}</a>
              </li>
            )}
          </ul>
          <p className={styles.source}>{c.source === 'SWISSGARAGE' ? `SwissGarage Nr. ${c.swissgarageNumber}` : 'Laufkundschaft (nur in der App)'}</p>
        </Card>

        <Card
          title="Fahrzeug"
          action={
            canEdit &&
            (v ? (
              <EditDataButton local={v.editable} label="Fahrzeugdaten ändern" onClick={() => setDialog('vehicle')} />
            ) : (
              <Button small onClick={() => navigate(`/tasks/${task.id}/edit`)}>
                Fahrzeug festlegen
              </Button>
            ))
          }
        >
          {v ? (
            <>
              <p className={styles.vehicle}>
                {v.licensePlate && <LicensePlate text={v.licensePlate} size="sm" />}
                <strong>{v.description}</strong>
              </p>
              <Facts
                rows={[
                  ['Jahrgang', v.modelYear],
                  ['Kilometer', v.mileageKm !== null && `${formatCount(v.mileageKm)} km`],
                  ['Chassis-Nr.', v.vin],
                  ['Farbe', v.color],
                  ['Treibstoff', v.fuel],
                ]}
              />
              {/* the task's own MFK appointment first – the hint below is about the last/next official date */}
              {task.mfk && (
                <p className={styles.mfk}>
                  MFK in diesem Auftrag: {task.mfkAppointment ? formatLocalDateTime(task.mfkAppointment) : 'Termin noch offen'}
                  {mfkStation && ` · ${mfkStation.name}`}
                  {task.mfkMinutes !== null && ` · ${formatDuration(task.mfkMinutes)} inkl. Fahrt`}
                  {` · fährt: ${employee(task.mfkDriverId)?.name ?? 'noch offen'}`}
                </p>
              )}
              <MfkHint vehicle={v} />
            </>
          ) : (
            <p className="muted">Fahrzeug noch offen</p>
          )}
        </Card>

        <Card title="Termin">
          <Facts
            rows={[
              // the times of a task with open time still say how long its lift is taken
              [
                'Termin',
                isPlanned(task)
                  ? `${formatDate(task.date)}, ${task.timeOpen ? `${TIME_OPEN} – Lift reserviert ` : ''}${timeRange(task.date, task.time, task.endAt)}`
                  : 'Noch keiner – über «Einplanen / Bearbeiten» festlegen',
              ],
              ['Kommt früher', task.arrivesEarlier && formatLocalDateTime(task.arrivesEarlier)],
              ['Fertig bis', task.readyBy && formatLocalDateTime(task.readyBy)],
              ['Wartekunde', task.waitingCustomer && 'Ja – Kunde wartet vor Ort'],
              // UI review: the old view called the mechanic "Termin erstellt von"
              ['Mechaniker', <PersonOrOpen key="m" employee={employee(task.mechanicId)} />],
              ['Lift', task.date ? (lifts?.find((l) => l.id === task.liftId)?.name ?? 'noch offen') : null],
            ]}
          />
        </Card>

        <Card title="Ersatzwagen">
          <CourtesyCarPanel task={task} canEdit={canEdit} />
        </Card>

        <Card title="Arbeiten">
          {items.length === 0 && !task.workDescription ? (
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
          {task.workDescription && <p className={styles.freeText}>{task.workDescription}</p>}
        </Card>

        {task.tireChange && (
          <Card
            title="Pneuhotel"
            action={
              canEdit &&
              tires.data &&
              !(tires.data.mounted && tires.data.removed) && (
                <Button small icon={CircleDot} onClick={() => navigate(`/tasks/${task.id}/tires`)}>
                  Radwechsel buchen
                </Button>
              )
            }
          >
            {tires.error ? (
              <p className="muted">Pneuhotel konnte nicht geladen werden: {tires.error.message}</p>
            ) : !tires.data ? (
              <p className="muted">Lade …</p>
            ) : (
              <TaskTiresPanel tires={tires.data} fromHotel={fromHotel} />
            )}
          </Card>
        )}

        {task.insuranceId && (
          <Card title="Versicherungsfall">
            <InsuranceFacts insuranceId={task.insuranceId} claimNumber={task.claimNumber} />
          </Card>
        )}

        <Card title="Pinnwand & To-dos">
          <TaskPinboard taskId={task.id} canEdit={canEdit} />
        </Card>

        <Card title="Auftragsnummer">
          <TaskNumberEditor task={task} canEdit={canEdit} />
        </Card>

        {task.notes && (
          <Card title="Notizen">
            <p className={styles.freeText}>{task.notes}</p>
          </Card>
        )}

        <Card title="Verlauf">
          <Facts
            rows={[
              ['Angenommen von', employee(task.acceptedById)?.name ?? null],
              ['Erfasst', <Who key="c" at={task.createdAt} employee={employee(task.createdBy)} />],
              ['Zuletzt geändert', <Who key="u" at={task.updatedAt} employee={employee(task.updatedBy)} />],
            ]}
          />
        </Card>
      </div>

      {dialog === 'customer' && <CustomerDialog customer={c} onSaved={() => setDialog(null)} onClose={() => setDialog(null)} />}
      {dialog === 'vehicle' && v && (
        <VehicleDialog vehicle={v} customerId={v.customerId} onSaved={() => setDialog(null)} onClose={() => setDialog(null)} />
      )}
    </>
  )
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** SwissGarage data is changed in SwissGarage (ADR 0003) – say so instead of a dead button. */
function EditDataButton({ local, label, onClick }: { local: boolean; label: string; onClick: () => void }) {
  if (!local) return <span className={styles.hint}>Änderungen in SwissGarage</span>
  return (
    <Button small variant="ghost" icon={Pencil} onClick={onClick}>
      {label}
    </Button>
  )
}

function PersonOrOpen({ employee }: { employee: Employee | undefined }) {
  return employee ? <NameBadge name={employee.name} color={employee.color} /> : <span className="muted">noch offen</span>
}

function Who({ at, employee }: { at: string; employee: Employee | undefined }) {
  return (
    <span className={styles.who}>
      {formatTimestamp(at)}
      {employee && <NameBadge name={employee.name} color={employee.color} />}
    </span>
  )
}

/** The insurance of an insurance case (FB-06) with its phone – to call about the claim. */
function InsuranceFacts({ insuranceId, claimNumber }: { insuranceId: string; claimNumber: string | null }) {
  const { data: insurances } = useInsurances()
  const insurance = insurances?.find((i) => i.id === insuranceId)
  return (
    <Facts
      rows={[
        ['Versicherung', insurance?.name ?? '–'],
        ['Telefon', insurance?.phone ?? null],
        ['E-Mail', insurance?.email ?? null],
        ['Schadennummer', claimNumber ?? 'noch offen'],
      ]}
    />
  )
}
