import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Textfeld } from './Felder'

describe('Textfeld', () => {
  it('ist über sein Label auffindbar (Label und Feld sind verknüpft)', () => {
    render(<Textfeld label="Vorname" />)
    expect(screen.getByLabelText('Vorname')).toBeTruthy()
  })

  it('zeigt eine Fehlermeldung und markiert das Feld als ungültig', () => {
    render(<Textfeld label="Nachname" fehler="darf nicht leer sein" />)

    const feld = screen.getByLabelText('Nachname')
    expect(feld.getAttribute('aria-invalid')).toBe('true')

    const meldung = screen.getByRole('alert')
    expect(meldung.textContent).toBe('darf nicht leer sein')
    expect(feld.getAttribute('aria-describedby')).toBe(meldung.id)
  })

  it('ist ohne Fehler nicht als ungültig markiert', () => {
    render(<Textfeld label="Ort" hinweis="Optional" />)
    expect(screen.getByLabelText('Ort').getAttribute('aria-invalid')).toBeNull()
  })
})
