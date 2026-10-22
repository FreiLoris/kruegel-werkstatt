import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Company } from '../../company/companyApi'
import type { Task } from '../taskApi'
import { TaskSheet } from './TaskSheet'
import type { ShoppingItem } from '../../shopping/shoppingApi'

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
  workDescription: 'Geräusch hinten links',
  notes: null,
  createdAt: '2026-10-05T07:00:00Z',
} as unknown as Task

describe('TaskSheet', () => {
  it('prints every ticked piece of work, not only the free text (F1)', () => {
    // its parts on the shopping list (FB-19), fictitious
    const parts = [{ description: 'Bremsscheiben vorne', quantity: 1, status: 'ORDERED', partNumber: null }] as unknown as ShoppingItem[]
    render(<TaskSheet task={task} company={company} lookups={{ serviceItemNames: new Map([['oil', 'Ölwechsel']]), mechanicName: 'Reto', acceptedByName: 'Carina', parts }} />)

    expect(screen.getByText('Radwechsel', { selector: 'li span' })).toBeTruthy()
    // in the list to tick off – and as its own block
    expect(screen.getAllByText('MFK')).toHaveLength(2)
    expect(screen.getByText('Ölwechsel')).toBeTruthy()
    expect(screen.getByText('Material: Bremsscheiben vorne')).toBeTruthy()
    expect(screen.getByText('Geräusch hinten links')).toBeTruthy()
    expect(screen.getByText('Carina')).toBeTruthy()
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

  it('tire change from the tire hotel, its data unknown: a line per set to fill in and ONE table for the depths (FB-06)', () => {
    render(<TaskSheet task={task} company={company} lookups={{ serviceItemNames: new Map() }} />)

    const block = screen.getByRole('heading', { name: 'Radwechsel' }).parentElement!
    expect(screen.getByText(/^Lagerplatz/)).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Profiltiefen' })).toBeTruthy()
    expect(screen.getByText(/ins Pneuhotel, Platz:/)).toBeTruthy()
    expect(screen.getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['VL', 'VR', 'HL', 'HR'])
    // the data once per set, not per wheel
    expect(block.textContent?.match(/Felgen/g)).toHaveLength(2)
    // torque and pressure unknown: lines to fill in, no warning about the bolts
    expect(block.textContent).toMatch(/Radschrauben mit\s+Nm angezogen · Luftdruck v\s+h\s+bar/)
    expect(block.textContent).not.toContain('beachten')
  })

  it('tire change from the tire hotel: its set, place and last depths printed, the set probably on the car too (13q)', () => {
    // fictitious tyres
    const depths = { frontLeft: 6, frontRight: 6, rearLeft: 5.5, rearRight: null }
    const winter = {
      id: 'w',
      season: 'WINTER',
      kind: 'WHEELS',
      rims: 'ALU',
      brand: 'Muster',
      model: 'Snow',
      dimension: '205/55 R16',
      year: 2022,
      depths,
      place: 'OG-B3-1',
      wheelBolts: true,
      remark: 'Felgenschloss im Handschuhfach',
      torque: 120,
      pressureFront: 2.5,
      pressureRear: 2.7,
    }
    const summer = { id: 's', season: 'SUMMER', kind: 'WHEELS', rims: null, brand: 'Sommer', model: null, dimension: null, year: null, depths, place: null }
    const tires = { mounted: null, removed: null, inHotel: [winter], retrieved: [summer] } as never
    render(<TaskSheet task={task} company={company} lookups={{ serviceItemNames: new Map(), tires }} />)

    expect(screen.getByText(/Winter · Kompletträder Alu · Muster Snow · 205\/55 R16 · 2022/)).toBeTruthy()
    expect(screen.getByText('Lagerplatz OG-B3-1')).toBeTruthy()
    expect(screen.getByText(/Sommer · Kompletträder · Sommer/)).toBeTruthy()
    expect(screen.getAllByText(/^zuletzt/).map((cell) => cell.textContent)).toEqual(['zuletzt 6,0 mm', 'zuletzt 6,0 mm', 'zuletzt 5,5 mm'])
    // FB-11, FB-17: what to mount it with, and the bolts not to miss
    expect(screen.getByText('120 Nm')).toBeTruthy()
    expect(screen.getByText('Luftdruck v 2,5 / h 2,7 bar')).toBeTruthy()
    expect(screen.getByText(/⚠ Radschrauben beachten – passende Schrauben im Auto suchen \(Felgenschloss im Handschuhfach\)/)).toBeTruthy()
  })

  it('tires brought: asks whether the removed ones are stored, no rims for tires only', () => {
    render(<TaskSheet task={{ ...task, tireChangeKind: 'TIRES_BROUGHT' }} company={company} lookups={{ serviceItemNames: new Map() }} />)

    expect(screen.queryByText(/^Lagerplatz/)).toBeNull()
    expect(screen.getByText(/einlagern\?/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Radwechsel' }).parentElement!.textContent).not.toContain('Felgen')
  })

  it('insurance case: insurance with phone, the claim number or a line for it (FB-06)', () => {
    // fictitious insurance
    const insurance = { name: 'Muster Versicherung', phone: '0800 000 000', email: null }
    const insured = { ...task, tireChange: false, tireChangeKind: null, insuranceId: 'i1', claimNumber: null }
    const { unmount } = render(<TaskSheet task={insured} company={company} lookups={{ serviceItemNames: new Map(), insurance }} />)

    expect(screen.getByRole('heading', { name: 'Versicherungsfall' })).toBeTruthy()
    expect(screen.getByText('Muster Versicherung')).toBeTruthy()
    expect(screen.getByText('Tel. 0800 000 000')).toBeTruthy()
    expect(screen.getByText(/^Schadennummer:/).querySelector('strong')).toBeNull()
    unmount()

    render(<TaskSheet task={{ ...insured, claimNumber: 'S-2026-0042' }} company={company} lookups={{ serviceItemNames: new Map(), insurance }} />)
    expect(screen.getByText('S-2026-0042')).toBeTruthy()
  })

  it('MFK: station with address, appointment and who drives – lines while open (FB-10)', () => {
    // fictitious station
    const mfkStation = { name: 'Prüfstelle Muster', address: 'Musterstrasse 1, 8000 Musterhausen', phone: null }
    const inspected = { ...task, tireChange: false, tireChangeKind: null, mfk: true, mfkAppointment: '2026-10-15T10:00:00', mfkMinutes: 90 }
    const { unmount } = render(
      <TaskSheet task={inspected} company={company} lookups={{ serviceItemNames: new Map(), mfkStation, mfkDriverName: 'Erich' }} />,
    )

    expect(screen.getByRole('heading', { name: 'MFK' })).toBeTruthy()
    expect(screen.getByText('Prüfstelle Muster')).toBeTruthy()
    expect(screen.getByText('Musterstrasse 1, 8000 Musterhausen')).toBeTruthy()
    expect(screen.getByText(/^Termin:/).textContent).toBe('Termin: 15.10.2026, 10:00 (1 Std. 30 Min. inkl. Fahrt)')
    expect(screen.getByText(/^Fährt:/).textContent).toBe('Fährt: Erich')
    unmount()

    render(<TaskSheet task={{ ...inspected, mfkAppointment: null }} company={company} lookups={{ serviceItemNames: new Map(), mfkStation }} />)
    expect(screen.getByText(/^Termin:/).querySelector('strong')).toBeNull()
  })

  it('no tire change = no tire block', () => {
    render(<TaskSheet task={{ ...task, tireChange: false, tireChangeKind: null }} company={company} lookups={{ serviceItemNames: new Map() }} />)

    expect(screen.queryByRole('table')).toBeNull()
  })
})
