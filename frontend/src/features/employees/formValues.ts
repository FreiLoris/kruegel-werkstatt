import { freeColor } from './colors'
import type { Employee, EmployeeRequest, Role } from './employeeApi'

/**
 * Form state. Numbers and dates stay text while typing
 * (a half typed date is not a date yet) – they are converted on submit.
 */
export interface FormValues {
  name: string
  role: Role
  color: string
  birthday: string
  vacationDaysPerYear: string
  selectableAsMechanic: boolean
  selectableForTodos: boolean
  hasPinboardColumn: boolean
  /** flexible hours: counts as "in" only on days entered as "Anwesend" */
  flexibleHours: boolean
}

/** Values on open: an existing person – or sensible defaults for a new one. */
export function initialValues(employee: Employee | undefined, takenColors: string[]): FormValues {
  if (employee) {
    return {
      name: employee.name,
      role: employee.role,
      color: employee.color,
      birthday: employee.birthday ?? '',
      vacationDaysPerYear: String(employee.vacationDaysPerYear),
      selectableAsMechanic: employee.selectableAsMechanic,
      selectableForTodos: employee.selectableForTodos,
      hasPinboardColumn: employee.hasPinboardColumn,
      flexibleHours: employee.flexibleHours,
    }
  }
  return {
    name: '',
    role: 'MECHANIC',
    color: freeColor(takenColors),
    birthday: '',
    vacationDaysPerYear: '25',
    selectableAsMechanic: true,
    selectableForTodos: true,
    hasPinboardColumn: true,
    flexibleHours: false,
  }
}

/** Form values → JSON for the API. `version` only when editing. */
export function toRequest(values: FormValues, version?: number): EmployeeRequest {
  return {
    name: values.name.trim(),
    role: values.role,
    color: values.color.toLowerCase(),
    birthday: values.birthday || undefined,
    vacationDaysPerYear: Number(values.vacationDaysPerYear),
    selectableAsMechanic: values.selectableAsMechanic,
    selectableForTodos: values.selectableForTodos,
    hasPinboardColumn: values.hasPinboardColumn,
    flexibleHours: values.flexibleHours,
    version,
  }
}
