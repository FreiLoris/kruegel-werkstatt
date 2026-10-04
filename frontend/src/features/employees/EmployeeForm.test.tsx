import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { COLOR_SUGGESTIONS } from './colors'
import type { Employee } from './employeeApi'
import { EmployeeForm } from './EmployeeForm'
import { initialValues, toRequest, type FormValues } from './formValues'

const erich: Employee = {
  id: '0190a000-0000-7000-8000-000000000001',
  version: 3,
  name: 'Erich',
  role: 'MECHANIC',
  color: '#ff9f9f',
  birthday: '1978-07-24',
  vacationDaysPerYear: 25,
  selectableAsMechanic: true,
  selectableForTodos: false,
  hasPinboardColumn: true,
  active: true,
  sortOrder: 1,
  updatedAt: '2026-10-01T06:00:00Z',
  updatedBy: null,
}

/** Form with its own state – like in the dialog, but without API */
function TestForm({ start, onSubmit, error, taken = new Map() }: {
  start: FormValues
  onSubmit: (values: FormValues) => void
  error?: Error
  taken?: Map<string, string>
}) {
  const [values, setValues] = useState(start)
  return <EmployeeForm id="test" values={values} onChange={setValues} onSubmit={() => onSubmit(values)} error={error} takenColors={taken} />
}

describe('initialValues', () => {
  it('takes over an existing person', () => {
    expect(initialValues(erich, [])).toMatchObject({ name: 'Erich', birthday: '1978-07-24', vacationDaysPerYear: '25', selectableForTodos: false })
  })

  it('suggests a free color for new ones', () => {
    expect(initialValues(undefined, [COLOR_SUGGESTIONS[0].value]).color).toBe(COLOR_SUGGESTIONS[1].value)
  })
})

describe('toRequest', () => {
  it('converts text to API values and leaves out an empty birthday', () => {
    const request = toRequest({ ...initialValues(erich, []), name: '  Erich  ', birthday: '', color: '#FF9F9F' }, 3)
    expect(request).toMatchObject({ name: 'Erich', color: '#ff9f9f', vacationDaysPerYear: 25, version: 3 })
    expect(request.birthday).toBeUndefined()
  })
})

describe('EmployeeForm', () => {
  it('submits the typed values', async () => {
    const onSubmit = vi.fn()
    render(
      <>
        <TestForm start={initialValues(undefined, [])} onSubmit={onSubmit} />
        <button type="submit" form="test">Speichern</button>
      </>,
    )

    await userEvent.type(screen.getByLabelText(/^Name/), 'Mora')
    await userEvent.selectOptions(screen.getByLabelText(/^Rolle/), 'MANAGEMENT')
    await userEvent.click(screen.getByLabelText('Blau'))
    await userEvent.click(screen.getByLabelText(/Pinnwand/))
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mora', role: 'MANAGEMENT', color: '#9fc8f0', hasPinboardColumn: false }),
    )
  })

  it('shows errors from the server right at the field', () => {
    const error = new ApiError({ status: 400, errors: [{ field: 'name', message: "'Erich' gibt es bereits" }] })
    render(<TestForm start={initialValues(undefined, [])} onSubmit={vi.fn()} error={error} />)

    expect(screen.getByLabelText(/^Name/).getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toBe("'Erich' gibt es bereits")
  })

  it('warns when someone already has the color', () => {
    render(<TestForm start={initialValues(erich, [])} onSubmit={vi.fn()} taken={new Map([['#ff9f9f', 'Reto']])} />)

    expect(screen.getByText('Diese Farbe hat bereits Reto.')).toBeTruthy()
    expect(screen.getByLabelText('Rot (hat bereits Reto)')).toBeTruthy()
  })
})
