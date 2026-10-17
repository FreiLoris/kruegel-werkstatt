import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { LoadFailed } from './LoadFailed'

const show = (error: Error, onRetry = vi.fn()) =>
  render(
    <MemoryRouter>
      <LoadFailed what="Auftrag" error={error} notFound="Diesen Auftrag gibt es nicht (mehr)." back={{ to: '/tasks', label: 'Zu den Terminen' }} onRetry={onRetry} />
    </MemoryRouter>,
  )

describe('LoadFailed', () => {
  it('not found: in words, no ID, no retry – but a way back', () => {
    show(new ApiError({ status: 404, title: 'Nicht gefunden', detail: 'Auftrag mit ID 1234 wurde nicht gefunden.' }))

    expect(screen.getByRole('heading').textContent).toBe('Auftrag nicht gefunden')
    expect(document.body.textContent).not.toContain('1234')
    expect(screen.queryByRole('button', { name: 'Nochmals versuchen' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Zu den Terminen' })).toBeTruthy()
  })

  it('a cut-off link (400) counts as not found too', () => {
    show(new ApiError({ status: 400, title: 'Ungültige Anfrage', detail: 'Ein Wert in der Adresse hat ein falsches Format.' }))
    expect(screen.getByRole('heading').textContent).toBe('Auftrag nicht gefunden')
  })

  it('network trouble offers to try again', () => {
    const retry = vi.fn()
    show(new Error('Keine Verbindung zum Server.'), retry)

    fireEvent.click(screen.getByRole('button', { name: 'Nochmals versuchen' }))
    expect(retry).toHaveBeenCalled()
  })
})
