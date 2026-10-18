import { useToday } from '../../../lib/clock'
import { useAbsences } from '../../absences/absenceApi'
import { useActiveEmployees } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { useHolidayNames } from '../../publicholidays/publicHolidayApi'
import { useTasksOfDay } from '../taskApi'
import type { AppointmentForm } from './appointmentForm'
import { dayWarnings } from './dayWarnings'

/** {@link dayWarnings} with the data of the chosen day – under the date and on the review. */
export function useAppointmentWarnings(form: AppointmentForm, taskId?: string): string[] {
  const today = useToday()
  const holidays = useHolidayNames()
  const day = form.noAppointment || !form.date ? undefined : form.date
  const { data: tasksOfDay } = useTasksOfDay(day)
  const { data: absences } = useAbsences(day ?? today, day ?? today)
  const { data: employees } = useActiveEmployees()
  const { data: lifts } = useAllLifts()
  return dayWarnings(form, { today, holidays, tasksOfDay, absences, employees, lifts, taskId })
}
