import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Company } from '../../company/companyApi'
import type { Task } from '../taskApi'
import { TaskSheet } from './TaskSheet'

const company: Company = {
  version: 0,
  name: 'Testgarage AG',
  street: 'Werkstattweg 1',
  postalCode: '8400',
  city: 'Winterthur',
  phone: '052 000 00 00',
  email: null,
  website: null,
  logoUrl: null,
}

// fictitious customer and vehicle
const task = {
  id: 't1',
  taskNumber: null,
  status: 'RECEIVED',
  customer: { displayName: 'Huber Peter', addition: null, street: 'Musterstrasse 12', postalCode: '8400', city: 'Winterthur', mobile: '079 000 00 01', phone: null, email: null },
  vehicle: { licensePlate: 'ZH 123456', description: 'VW Golf', modelYear: 2019, mileageKm: 86000, vin: null, color: null, fuel: null, lastMfk: null, nextMfk: null },
  date: '2026-10-15',
  time: '08:00:00',
  endAt: '2026-10-15T11:30:00',
  arrivesEarlier: '2026-10-14T17:00:00',
  readyBy: null,
  waitingCustomer: true,
  mechanicId: 'm1',
  liftId: null,
  tireChange: true,
  tireChangeKind: 'WHEELS_STORED',
  mfk: true,
  mfkAppointment: null,
  serviceItemIds: ['oil'],
  parts: { description: 'Bremsscheiben vorne', status: 'ORDERED', supplier: null, orderedOn: null },
  workDescription: 'Geräusch hinten links',
  notes: null,
  createdAt: '2026-10-05T07:00:00Z',
} as unknown as Task

describe('TaskSheet', () => {
  it('prints every ticked piece of work, not only the free text (F1)', () => {
    render(<TaskSheet task={task} company={company} lookups={{ serviceItemNames: new Map([['oil', 'Ölwechsel']]), mechanicName: 'Reto' }} />)

    expect(screen.getByText('Radwechsel')).toBeTruthy()
    expect(screen.getByText('MFK')).toBeTruthy()
    expect(screen.getByText('Ölwechsel')).toBeTruthy()
    expect(screen.getByText('Material: Bremsscheiben vorne')).toBeTruthy()
    expect(screen.getByText('Geräusch hinten links')).toBeTruthy()
  })

  it('has the letterhead from the company profile and the customer address', () => {
    render(<TaskSheet task={task} company={company} lookups={{ serviceItemNames: new Map() }} />)

    expect(screen.getByText('Testgarage AG')).toBeTruthy()
    expect(screen.getByText('Werkstattweg 1, 8400 Winterthur')).toBeTruthy()
    expect(screen.getByText('Musterstrasse 12')).toBeTruthy()
    expect(screen.getByText('8400 Winterthur')).toBeTruthy()
  })

  it('shows appointment details and what is still open', () => {
    render(<TaskSheet task={task} company={company} lookups={{ serviceItemNames: new Map(), mechanicName: 'Reto' }} />)

    expect(screen.getByText('15.10.2026, 08:00–11:30')).toBeTruthy()
    expect(screen.getByText('14.10.2026, 17:00')).toBeTruthy()
    expect(screen.getByText('Ja – Kunde wartet vor Ort')).toBeTruthy()
    expect(screen.getByText('Reto')).toBeTruthy()
    // lift not chosen yet
    expect(screen.getByText('noch offen')).toBeTruthy()
    // no courtesy car → no line
    expect(screen.queryByText('Ersatzwagen')).toBeNull()
  })

  it('tells the mechanic about the courtesy car', () => {
    const courtesyCar = 'Ersatzwagen 2 (Skoda Fabia, ZH 10002), 15.10.2026, 08:00 – 15.10.2026, 17:00'
    render(<TaskSheet task={task} company={company} lookups={{ serviceItemNames: new Map(), courtesyCar }} />)

    expect(screen.getByText('Ersatzwagen')).toBeTruthy()
    expect(screen.getByText(courtesyCar)).toBeTruthy()
  })
})
