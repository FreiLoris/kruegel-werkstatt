import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiFehler } from '../../api/fehler'
import { FARBVORSCHLAEGE } from './farben'
import { alsEingabe, startwerte, type Formularwerte } from './formularwerte'
import { MitarbeiterFormular } from './MitarbeiterFormular'
import type { Mitarbeiter } from './mitarbeiterApi'

const erich: Mitarbeiter = {
  id: '0190a000-0000-7000-8000-000000000001',
  version: 3,
  name: 'Erich',
  rolle: 'MECHANIKER',
  farbe: '#ff9f9f',
  geburtstag: '1978-07-24',
  ferienanspruch: 25,
  alsMechanikerWaehlbar: true,
  fuerAufgabenWaehlbar: false,
  pinnwandSpalte: true,
  aktiv: true,
  reihenfolge: 1,
  geaendertAm: '2026-10-01T06:00:00Z',
  geaendertVon: null,
}

/** Formular mit eigenem Zustand – wie im Dialog, aber ohne API */
function TestFormular({ start, onAbsenden, fehler, vergeben = new Map() }: {
  start: Formularwerte
  onAbsenden: (werte: Formularwerte) => void
  fehler?: Error
  vergeben?: Map<string, string>
}) {
  const [werte, setWerte] = useState(start)
  return (
    <MitarbeiterFormular id="test" werte={werte} onAendern={setWerte} onAbsenden={() => onAbsenden(werte)} fehler={fehler} farbenVergeben={vergeben} />
  )
}

describe('startwerte', () => {
  it('übernimmt eine bestehende Person', () => {
    expect(startwerte(erich, [])).toMatchObject({ name: 'Erich', geburtstag: '1978-07-24', ferienanspruch: '25', fuerAufgabenWaehlbar: false })
  })

  it('schlägt für Neue eine noch freie Farbe vor', () => {
    expect(startwerte(undefined, [FARBVORSCHLAEGE[0].wert]).farbe).toBe(FARBVORSCHLAEGE[1].wert)
  })
})

describe('alsEingabe', () => {
  it('wandelt Text in API-Werte um und lässt leeren Geburtstag weg', () => {
    const eingabe = alsEingabe({ ...startwerte(erich, []), name: '  Erich  ', geburtstag: '', farbe: '#FF9F9F' }, 3)
    expect(eingabe).toMatchObject({ name: 'Erich', farbe: '#ff9f9f', ferienanspruch: 25, version: 3 })
    expect(eingabe.geburtstag).toBeUndefined()
  })
})

describe('MitarbeiterFormular', () => {
  it('sendet die eingetippten Werte ab', async () => {
    const onAbsenden = vi.fn()
    render(
      <>
        <TestFormular start={startwerte(undefined, [])} onAbsenden={onAbsenden} />
        <button type="submit" form="test">Speichern</button>
      </>,
    )

    await userEvent.type(screen.getByLabelText(/^Name/), 'Mora')
    await userEvent.selectOptions(screen.getByLabelText(/^Rolle/), 'GESCHAEFTSFUEHRUNG')
    await userEvent.click(screen.getByLabelText('Blau'))
    await userEvent.click(screen.getByLabelText(/Pinnwand/))
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onAbsenden).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mora', rolle: 'GESCHAEFTSFUEHRUNG', farbe: '#9fc8f0', pinnwandSpalte: false }),
    )
  })

  it('zeigt Fehler vom Server direkt beim Feld', () => {
    const fehler = new ApiFehler({ status: 400, fehler: [{ feld: 'name', meldung: "'Erich' gibt es bereits" }] })
    render(<TestFormular start={startwerte(undefined, [])} onAbsenden={vi.fn()} fehler={fehler} />)

    expect(screen.getByLabelText(/^Name/).getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toBe("'Erich' gibt es bereits")
  })

  it('warnt, wenn die Farbe schon jemand hat', () => {
    render(<TestFormular start={startwerte(erich, [])} onAbsenden={vi.fn()} vergeben={new Map([['#ff9f9f', 'Reto']])} />)

    expect(screen.getByText('Diese Farbe hat bereits Reto.')).toBeTruthy()
    expect(screen.getByLabelText('Rot (hat bereits Reto)')).toBeTruthy()
  })
})
