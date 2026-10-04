import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LicensePlate } from './LicensePlate'
import { LicensePlateField } from './LicensePlateField'

describe('LicensePlateField', () => {
  it('starts with Switzerland and canton Zurich for a new plate', async () => {
    const onChange = vi.fn()
    render(<LicensePlateField value="" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Nummer'), '12a34')

    // Only digits are accepted
    expect(onChange).toHaveBeenLastCalledWith('ZH 1234')
    expect(screen.getByRole('img', { name: 'Kennzeichen ZH 1234' })).toBeTruthy()
  })

  it('shows an existing plate in its parts and changes the canton', async () => {
    const onChange = vi.fn()
    render(<LicensePlateField value="SG 197052" onChange={onChange} />)

    expect((screen.getByLabelText('Nummer') as HTMLInputElement).value).toBe('197052')
    await userEvent.selectOptions(screen.getByLabelText('Kanton'), 'TG')

    expect(onChange).toHaveBeenLastCalledWith('TG 197052')
  })

  it('foreign plates: country code and free number', async () => {
    const onChange = vi.fn()
    render(<LicensePlateField value="" onChange={onChange} />)

    await userEvent.selectOptions(screen.getByLabelText('Land'), 'D')
    await userEvent.type(screen.getByLabelText('Nummer'), 'm ab 1234')

    expect(screen.queryByLabelText('Kanton')).toBeNull()
    expect(onChange).toHaveBeenLastCalledWith('D M AB 1234')
  })

  it('shows the server error', () => {
    render(<LicensePlateField value="ZH 1" onChange={vi.fn()} error="gehört bereits zu einem anderen Ersatzwagen" />)

    expect(screen.getByRole('alert').textContent).toBe('gehört bereits zu einem anderen Ersatzwagen')
  })
})

describe('LicensePlate', () => {
  it('groups the digits like the real plate and shows the coat of arms', () => {
    render(<LicensePlate text="SG 197052" />)

    const plate = screen.getByRole('img', { name: 'Kennzeichen SG 197052' })
    expect(plate.textContent).toBe('SG·197 052')
    // Small SVGs are inlined by Vite as data URL – only check that a coat of arms is there
    expect(plate.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/svg|\.svg/)
  })

  it('foreign plates have no coat of arms', () => {
    render(<LicensePlate text="D M AB 1234" />)

    expect(screen.getByRole('img', { name: 'Kennzeichen D M AB 1234' }).querySelector('img')).toBeNull()
  })
})
