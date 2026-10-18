import { isWeekend, weekdayOf } from '../../../lib/calendar'
import { formatDate } from '../../../lib/format'
import { ABSENCE_CATEGORY, type Absence } from '../../absences/absenceApi'
import { absencesOn, dayLabel } from '../../absences/absenceDays'
import type { Employee } from '../../employees/employeeApi'
import type { Lift } from '../../lifts/liftApi'
import type { Task } from '../taskApi'
import type { AppointmentForm } from './appointmentForm'

export interface WarningContext {
  today: string
  holidays: ReadonlyMap<string, string>
  /** the tasks on the chosen day – for a lift taken at that time */
  tasksOfDay?: Task[]
  absences?: Absence[]
  employees?: Employee[]
  lifts?: Lift[]
  /** editing: the task itself is no collision */
  taskId?: string
}

const minute = (dateTime: string) => dateTime.slice(0, 16)
const time = (dateTime: string) => dateTime.slice(11, 16)

/**
 * What is worth a second look before saving – saving stays possible (UX M-01, M-02): a day in the
 * past, a weekend or holiday, the mechanic away, the lift already taken at that time, or no work at
 * all. Before, these were saved without a word (or the lift only came up on saving).
 */
export function dayWarnings(form: AppointmentForm, context: WarningContext): string[] {
  const warnings: string[] = []
  const work = form.tireChange || form.mfk || form.service || form.parts || form.workDescription.trim() !== ''
  if (!form.noAppointment && form.date) {
    if (form.date < context.today) warnings.push(`Das Datum (${formatDate(form.date)}) liegt in der Vergangenheit.`)
    const holiday = context.holidays.get(form.date)
    if (holiday) warnings.push(`An diesem Tag ist ${holiday} – ist die Werkstatt offen?`)
    else if (isWeekend(form.date)) warnings.push(`Der Termin ist an einem ${weekdayOf(form.date) === 5 ? 'Samstag' : 'Sonntag'}.`)

    const mechanic = context.employees?.find((e) => e.id === form.mechanicId)
    if (mechanic) {
      const away = absencesOn(context.absences ?? [], form.date).find(
        (day) => day.absence.employeeId === mechanic.id && day.absence.category !== 'PRESENT',
      )
      if (away) {
        const part = dayLabel(away)
        warnings.push(`${mechanic.name} ist an diesem Tag nicht da (${ABSENCE_CATEGORY[away.absence.category]}${part ? `, ${part}` : ''}).`)
      }
    }

    if (form.liftId && form.time && form.endDate && form.endTime) {
      const start = `${form.date}T${form.time}`
      const end = `${form.endDate}T${form.endTime}`
      const blocking = (context.tasksOfDay ?? []).find(
        (task) => task.id !== context.taskId && task.liftId === form.liftId && minute(`${task.date}T${task.time}`) < end && start < minute(task.endAt),
      )
      if (blocking) {
        const lift = context.lifts?.find((l) => l.id === form.liftId)?.name ?? 'Der Lift'
        warnings.push(
          `${lift} ist ${time(`${blocking.date}T${blocking.time}`)}–${time(blocking.endAt)} belegt (${blocking.customer.displayName}) – andere Zeit oder anderer Lift?`,
        )
      }
    }
  }
  if (!work) warnings.push('Noch keine Arbeit angegeben – was soll gemacht werden?')
  return warnings
}
