import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextField } from './Fields'

describe('TextField', () => {
  it('can be found by its label (label and field are linked)', () => {
    render(<TextField label="Vorname" />)
    expect(screen.getByLabelText('Vorname')).toBeTruthy()
  })

  it('shows an error message and marks the field as invalid', () => {
    render(<TextField label="Nachname" error="darf nicht leer sein" />)

    const field = screen.getByLabelText('Nachname')
    expect(field.getAttribute('aria-invalid')).toBe('true')

    const message = screen.getByRole('alert')
    expect(message.textContent).toBe('darf nicht leer sein')
    expect(field.getAttribute('aria-describedby')).toBe(message.id)
  })

  it('is not marked invalid without an error', () => {
    render(<TextField label="Ort" hint="Optional" />)
    expect(screen.getByLabelText('Ort').getAttribute('aria-invalid')).toBeNull()
  })
})
