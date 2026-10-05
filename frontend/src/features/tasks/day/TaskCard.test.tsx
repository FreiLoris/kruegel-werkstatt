import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Employee } from '../../employees/employeeApi'
import type { Task } from '../taskApi'
import { TaskCard } from './TaskCard'

// fictitious customer
const task = {
  id: 't1',
  status: 'IN_PROGRESS',
  time: '07:30:00',
  endAt: '2026-10-15T09:00:00',
  date: '2026-10-15',
  customer: { displayName: 'Huber Peter' },
  vehicle: null,
  waitingCustomer: true,
  readyBy: '2026-10-16T12:00:00',
  tireChange: true,
  tireChangeKind: null,
  mfk: false,
  mfkAppointment: null,
  serviceItemIds: [],
  parts: null,
  workDescription: 'Winterräder',
} as unknown as Task

const reto = { id: 'm1', name: 'Reto', color: '#f6d860' } as Employee

function renderCard(mechanic?: Employee) {
  render(
    <MemoryRouter>
      <TaskCard task={task} mechanic={mechanic} serviceItemNames={new Map()} />
    </MemoryRouter>,
  )
}

describe('TaskCard', () => {
  it('shows status, mechanic and all work (UI review: mechanic was missing)', () => {
    renderCard(reto)

    expect(screen.getByText('In Arbeit')).toBeTruthy()
    expect(screen.getByText('Reto')).toBeTruthy()
    expect(screen.getByText('Radwechsel · Winterräder')).toBeTruthy()
  })

  it('says what is still open and shows waiting customer and ready-by on another day', () => {
    renderCard()

    expect(screen.getByText('Fahrzeug offen')).toBeTruthy()
    expect(screen.getByText('Mechaniker offen')).toBeTruthy()
    expect(screen.getByText(/Wartet/)).toBeTruthy()
    expect(screen.getByText(/bis Fr 16\.10\. 12:00/)).toBeTruthy()
  })
})
