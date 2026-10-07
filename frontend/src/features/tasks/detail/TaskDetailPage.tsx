import { ArrowLeft, Mail, Pencil, Phone, Printer, Smartphone, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { useConfirm } from '../../../components/ui/confirmContext'
import { Facts } from '../../../components/ui/Facts'
import { useToast } from '../../../components/ui/toastContext'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { formatCount, formatDate, formatLocalDateTime, formatTime, formatTimestamp } from '../../../lib/format'
import { CourtesyCarPanel } from '../../bookings/CourtesyCarPanel'
import { CustomerDialog } from '../../customers/CustomerDialog'
import { useAllEmployees, type Employee } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import { useAllLifts } from '../../lifts/liftApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { TaskNotes } from '../../notes/TaskNotes'
import { TaskTodos } from '../../todos/TaskTodos'
import { MfkHint } from '../../vehicles/MfkHint'
import { VehicleDialog } from '../../vehicles/VehicleDialog'
import { TASK_STATUS, useChangeTaskStatus, useDeleteTask, useTask, type Task, type TaskStatus } from '../taskApi'
import { TaskStatusBadge } from '../TaskStatusBadge'
import { timeRange } from '../taskTime'
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

  if (task.error) return <p className="muted">Auftrag konnte nicht geladen werden: {task.error.message}</p>
  if (!task.data) return <p className="muted">Lade Auftrag …</p>
  return <TaskDetail task={task.data} />
}

function TaskDetail({ task }: { task: Task }) {
  const navigate = useNavigate()
  const canEdit = useCanEdit()
  const confirm = useConfirm()
  const toast = useToast()
  const changeStatus = useChangeTaskStatus()
  const remove = useDeleteTask()
  const { data: employees } = useAllEmployees()
  const { data: lifts } = useAllLifts()
  const { data: serviceItems } = useAllServiceItems()
  const [dialog, setDialog] = useState<'customer' | 'vehicle' | null>(null)

  const names = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])
  const employee = (id: string | null) => employees?.find((e) => e.id === id)
  const backToDay = () => navigate(`/tasks?date=${task.date}`)
  const c = task.customer
  const v = task.vehicle
  const items = workItems(task, names)

  function setStatus(status: TaskStatus) {
    changeStatus.mutate(
      { id: task.id, status },
      { onError: (error) => toast.error(`Status konnte nicht geändert werden: ${error.message}`) },
    )
  }

  async function deleteTask() {
    const ok = await confirm({
      title: 'Auftrag löschen?',
      text: `${c.displayName}, ${formatDate(task.date)} ${formatTime(task.time)} wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.`,
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

  return (
    <>
      <Button variant="ghost" icon={ArrowLeft} onClick={backToDay}>
        Zu den Terminen vom {formatDate(task.date)}
      </Button>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{c.displayName}</h1>
          <p className={styles.when}>
            {WEEKDAYS_SHORT[weekdayOf(task.date)]} {formatDate(task.date)}, {formatTime(task.time)} Uhr
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
                Bearbeiten
              </Button>
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
              ['Termin', `${formatDate(task.date)}, ${timeRange(task.date, task.time, task.endAt)}`],
              ['Kommt früher', task.arrivesEarlier && formatLocalDateTime(task.arrivesEarlier)],
              ['Fertig bis', task.readyBy && formatLocalDateTime(task.readyBy)],
              ['Wartekunde', task.waitingCustomer && 'Ja – Kunde wartet vor Ort'],
              // UI review: the old view called the mechanic "Termin erstellt von"
              ['Mechaniker', <PersonOrOpen key="m" employee={employee(task.mechanicId)} />],
              ['Lift', lifts?.find((l) => l.id === task.liftId)?.name ?? 'noch offen'],
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

        <Card title="To-dos">
          <TaskTodos taskId={task.id} canEdit={canEdit} />
        </Card>

        <Card title="Pinnwand">
          <TaskNotes taskId={task.id} canEdit={canEdit} />
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
