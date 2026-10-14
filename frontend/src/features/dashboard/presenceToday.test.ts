import { describe, expect, it } from 'vitest'
import type { Absence } from '../absences/absenceApi'
import type { Employee } from '../employees/employeeApi'
import { presenceOn } from './presenceToday'

// fictitious
const person = (id: string, name: string, more: Partial<Employee> = {}) => ({ id, name, color: '#cccccc', active: true, flexibleHours: false, ...more }) as Employee
const reto = person('r', 'Reto')
const erich = person('e', 'Erich')
const office = person('o', 'Büro', { flexibleHours: true })
const gone = person('g', 'Weg', { active: false })
const team = [reto, erich, office, gone]

const DAY = '2026-10-13'
const entry = (employeeId: string, category: Absence['category'], more: Partial<Absence> = {}) =>
  ({ id: `${employeeId}-${category}-${more.startsAfternoon}`, employeeId, category, company: null, startDate: DAY, startsAfternoon: false, endDate: DAY, endsNoon: false, ...more }) as Absence

const names = (list: { employee: Employee }[]) => list.map((p) => p.employee.name)

describe('presenceOn', () => {
  it('regular hours: in on a working day unless an absence says otherwise', () => {
    const { present, away } = presenceOn(team, [entry('e', 'VACATION')], DAY, true)

    expect(names(present)).toEqual(['Reto'])
    expect(away).toEqual([{ employee: erich, reason: 'Ferien' }])
  })

  it('flexible hours: in only when entered as "Anwesend" – and never listed as away', () => {
    expect(names(presenceOn(team, [], DAY, true).present)).toEqual(['Reto', 'Erich'])

    const { present, away } = presenceOn(team, [entry('o', 'PRESENT', { endsNoon: true })], DAY, true)
    expect(present.map((p) => [p.employee.name, p.part])).toEqual([
      ['Reto', 'full'],
      ['Erich', 'full'],
      ['Büro', 'morning'],
    ])
    expect(away).toEqual([])
  })

  it('half a day away = in for the other half, and away for that half', () => {
    const training = entry('e', 'EXTERNAL_WORK', { company: 'Garage Muster AG', endsNoon: true })

    const { present, away } = presenceOn(team, [training], DAY, true)

    expect(present.find((p) => p.employee === erich)?.part).toBe('afternoon')
    expect(away).toEqual([{ employee: erich, reason: 'Fremdarbeit Garage Muster AG (Vormittag)' }])
  })

  it('morning and afternoon away with two entries = not in at all', () => {
    const both = [entry('e', 'SICK', { endsNoon: true }), entry('e', 'TRAINING', { startsAfternoon: true })]

    const { present, away } = presenceOn(team, both, DAY, true)

    expect(names(present)).toEqual(['Reto'])
    expect(away.map((a) => a.reason)).toEqual(['Krank (Vormittag)', 'Kurs (Nachmittag)'])
  })

  it('on a weekend or holiday nobody with regular hours is expected – flexible ones entered still count', () => {
    expect(presenceOn(team, [entry('e', 'VACATION')], DAY, false)).toEqual({ present: [], away: [] })
    expect(names(presenceOn(team, [entry('o', 'PRESENT')], DAY, false).present)).toEqual(['Büro'])
  })

  it('"Anwesend" entered for someone with regular hours changes nothing', () => {
    expect(presenceOn([reto], [entry('r', 'PRESENT', { endsNoon: true })], DAY, true).present).toEqual([{ employee: reto, part: 'full', label: '' }])
  })

  it('away for some hours (FB-05) = in for the rest of the day, both with the time', () => {
    const doctor = entry('r', 'SICK', { startTime: '09:00:00', endTime: '10:30:00' })
    const untilTen = entry('e', 'TRAINING', { endTime: '10:30:00' })

    const { present, away } = presenceOn([reto, erich], [doctor, untilTen], DAY, true)

    expect(away.map((a) => a.reason)).toEqual(['Krank 09:00–10:30', 'Kurs bis 10:30'])
    expect(present.map((p) => [p.employee.name, p.label])).toEqual([
      ['Reto', 'ausser 09:00–10:30'],
      ['Erich', 'ab 10:30'],
    ])
  })

  it('flexible hours entered with times show them', () => {
    const office8to11 = entry('o', 'PRESENT', { startTime: '08:00:00', endTime: '11:30:00' })

    expect(presenceOn([office], [office8to11], DAY, true).present).toEqual([{ employee: office, part: 'morning', label: '08:00–11:30' }])
  })
})
