import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Stammdatenliste, type StammdatenlisteTexte } from './Stammdatenliste'

const texte: StammdatenlisteTexte = {
  titel: 'Lifts',
  beschreibung: '',
  neu: 'Lift hinzufügen',
  deaktivieren: 'Stilllegen',
  inaktiv: 'Stillgelegt',
  aktivieren: 'Wieder in Betrieb',
}

const lifts = [
  { id: '1', name: 'Lift 1', aktiv: true },
  { id: '2', name: 'Lift 2', aktiv: true },
  { id: '3', name: 'Alt', aktiv: false },
]

function zeigen(props: Partial<Parameters<typeof Stammdatenliste>[0]> = {}) {
  const handler = { onNeu: vi.fn(), onUmbenennen: vi.fn(), onDeaktivieren: vi.fn(), onAktivieren: vi.fn(), onReihenfolge: vi.fn() }
  render(<Stammdatenliste eintraege={lifts} texte={texte} darfAendern beschaeftigt={false} {...handler} {...props} />)
  return handler
}

describe('Stammdatenliste', () => {
  it('verschiebt mit ↓ und meldet die neue Reihenfolge der aktiven', async () => {
    const { onReihenfolge } = zeigen()

    await userEvent.click(screen.getByLabelText('Lift 1 nach unten'))

    expect(onReihenfolge).toHaveBeenCalledWith(['2', '1'])
  })

  it('zeigt Inaktive getrennt mit «Wieder in Betrieb»', async () => {
    const { onAktivieren } = zeigen()

    await userEvent.click(screen.getByText('Stillgelegt (1)'))
    await userEvent.click(screen.getByRole('button', { name: 'Wieder in Betrieb' }))

    expect(onAktivieren).toHaveBeenCalledWith(lifts[2])
  })

  it('schützt den letzten aktiven Eintrag, wenn verlangt', () => {
    zeigen({ eintraege: [lifts[0]], mindestensEinerAktiv: true })

    expect(screen.getByLabelText('Lift 1: Stilllegen')).toHaveProperty('disabled', true)
  })

  it('zeigt bei «nur ansehen» keine Knöpfe', () => {
    zeigen({ darfAendern: false })

    expect(screen.queryByRole('button')).toBeNull()
  })
})
