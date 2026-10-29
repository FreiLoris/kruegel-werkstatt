import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SmsTemplateField } from './SmsTemplateField'

vi.mock('./reminderApi', () => ({
  useSmsPreview: () => ({ data: { text: 'Guten Tag Herr Muster, bis Morgen!', characters: 178, parts: 2, replaced: ['–'], unknown: ['{Datum}'] } }),
}))

const settings = { placeholders: ['Anrede', 'Termin'], standardTemplate: '{Anrede}\n{Termin}' }

describe('SmsTemplateField (17e)', () => {
  it('a placeholder goes where the cursor is', () => {
    const onChange = vi.fn()
    render(<SmsTemplateField value="Hallo , bis bald" onChange={onChange} settings={settings} disabled={false} />)
    const area = screen.getByLabelText('SMS-Text') as HTMLTextAreaElement
    area.setSelectionRange(6, 6)
    fireEvent.click(screen.getByRole('button', { name: '{Anrede}' }))
    expect(onChange).toHaveBeenCalledWith('Hallo {Anrede}, bis bald')
  })

  it('the standard text back', () => {
    const onChange = vi.fn()
    render(<SmsTemplateField value="eigener Text" onChange={onChange} settings={settings} disabled={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Standardtext' }))
    expect(onChange).toHaveBeenCalledWith('{Anrede}\n{Termin}')
  })

  it('shows the example, what it costs, and what is wrong', () => {
    render(<SmsTemplateField value="x" onChange={() => {}} settings={settings} disabled={false} />)
    expect(screen.getByText('Guten Tag Herr Muster, bis Morgen!')).toBeTruthy()
    expect(screen.getByText('178 Zeichen = 2 SMS (jede wird bezahlt)')).toBeTruthy()
    expect(screen.getByText(/Unbekannt: \{Datum\}/)).toBeTruthy()
    expect(screen.getByText(/wird ersetzt: –/)).toBeTruthy()
  })

  it('read only: no buttons', () => {
    render(<SmsTemplateField value="x" onChange={() => {}} settings={settings} disabled />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
