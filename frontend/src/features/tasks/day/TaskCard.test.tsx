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
  workDescription: 'Winterräder',
} as unknown as Task

const reto = { id: 'm1', name: 'Reto', color: '#f6d860' } as Employee

function renderCard(mechanic?: Employee, shown: Task = task) {
  render(
    <MemoryRouter>
      <TaskCard task={shown} mechanic={mechanic} serviceItemNames={new Map()} />
    </MemoryRouter>,
  )
}

describe('TaskCard', () => {
  it('shows status, mechanic and all work (UI review: mechanic was missing)', () => {
    renderCard(reto)

    expect(screen.getByText(/In Arbeit/)).toBeTruthy()
    expect(screen.getByLabelText('Reto')).toBeTruthy()
    expect(screen.getByText('Radwechsel · Winterräder')).toBeTruthy()
  })

  it('says what is still open and shows waiting customer and ready-by on another day', () => {
    renderCard()

    expect(screen.getByText('Fahrzeug offen')).toBeTruthy()
    expect(screen.getByTitle('Mechaniker offen')).toBeTruthy()
    expect(screen.getByText(/Wartet/)).toBeTruthy()
    expect(screen.getByText(/bis Fr 16\.10\. 12:00/)).toBeTruthy()
  })

  it('a short block shortens customer and vehicle with "…" – the tooltip has the whole text', () => {
    const long = {
      ...task,
      customer: { displayName: 'Muster Kranreparaturen und Service AG' },
      vehicle: { licensePlate: null, description: 'Mercedes-Benz Sprinter 316 CDI lang' },
    } as unknown as Task
    renderCard(reto, long)

    expect(screen.getByText('Muster Kranreparaturen und Service AG').getAttribute('title')).toBe('Muster Kranreparaturen und Service AG')
    expect(screen.getByText('Mercedes-Benz Sprinter 316 CDI lang').getAttribute('title')).toBe('Mercedes-Benz Sprinter 316 CDI lang')
  })
})
