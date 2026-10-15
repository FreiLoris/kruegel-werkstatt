import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { emptyForm, tireSetErrors, type TireSetForm } from './tireSetForm'
import { TreadDepthsInput } from './TreadDepthsInput'

const limits = { version: 0, summerMm: 3, winterMm: 4, minimumMm: 1.6 }

function Harness({ initial }: { initial: TireSetForm }) {
  const [form, setForm] = useState(initial)
  return <TreadDepthsInput form={form} onChange={setForm} errors={tireSetErrors(form, '2026-10-15')} limits={limits} />
}

describe('TreadDepthsInput', () => {
  it('one field for all four; the status and the hint to talk to the customer right away', () => {
    render(<Harness initial={{ ...emptyForm('2026-10-15'), season: 'WINTER' }} />)

    fireEvent.change(screen.getByLabelText('Profiltiefe in mm (alle vier)'), { target: { value: '3,5' } })

    expect(screen.getByText('ansprechen')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('VL, VR, HL, HR')
  })

  it('unticked: each wheel around the car, only the worn one is mentioned', () => {
    render(<Harness initial={{ ...emptyForm('2026-10-15'), season: 'SUMMER' }} />)

    fireEvent.change(screen.getByLabelText('Profiltiefe in mm (alle vier)'), { target: { value: '6' } })
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByLabelText('Alle vier gleich'))
    fireEvent.change(screen.getByLabelText('HR – Hinten rechts'), { target: { value: '1,2' } })

    expect(screen.getByText('unter gesetzlichem Minimum')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('HR teils unter dem gesetzlichen Minimum')
    expect((screen.getByLabelText('VL – Vorne links') as HTMLInputElement).value).toBe('6')
  })
})
