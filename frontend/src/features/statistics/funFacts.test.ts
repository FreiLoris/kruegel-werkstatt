import { describe, expect, it } from 'vitest'
import { funFacts } from './funFacts'
import { testStatistics } from './testStatistics'

const textOf = (topic: string, stats = testStatistics()) => funFacts(stats).find((fact) => fact.topic === topic)?.text

describe('funFacts', () => {
  it('makes the kilometres tangible: around the earth and to the moon', () => {
    expect(textOf('Kilometer')).toBe('Alle Fahrzeuge zusammen sind 25’000’000 km gefahren: 623,8-mal um die Erde – oder 65-mal bis zum Mond.')
  })

  it('only says what the data allows – no "0-mal um die Erde" in a new workshop', () => {
    const stats = testStatistics()
    stats.vehicles.totalKm = 1000
    stats.tasks.perWeekday = [0, 0, 0, 0, 0, 0, 0]
    stats.tasks.busiestDay = null
    stats.customers.firstNames = [{ label: 'Peter', count: 1 }]

    const topics = funFacts(stats).map((fact) => fact.topic)

    expect(topics).not.toContain('Kilometer')
    expect(topics).not.toContain('Lieblingstag')
    expect(topics).not.toContain('Rekordtag')
    expect(topics).not.toContain('Vorname')
  })

  it('names the busiest weekday, hour, record day and the singular', () => {
    expect(textOf('Lieblingstag')).toBe('Am meisten los ist am Dienstag.')
    expect(textOf('Rush Hour')).toBe('Die beliebteste Termin-Zeit ist 08 Uhr – 45 Termine starten dann.')
    expect(textOf('Rekordtag')).toBe('Am meisten Termine an einem Tag: 9 am 19.10.2026.')
    expect(textOf('Ersatzwagen')).toBe('Die Ersatzwagen waren zusammen 1 Tag unterwegs.')
  })

  it('one appointment "startet"', () => {
    const stats = testStatistics()
    stats.tasks.perHour = [{ label: '07', count: 1 }]

    expect(textOf('Rush Hour', stats)).toBe('Die beliebteste Termin-Zeit ist 07 Uhr – 1 Termin startet dann.')
  })

  it('the queue in metres below a kilometre, in km from there', () => {
    expect(textOf('Stau')).toBe('Stellt man alle 200 Fahrzeuge hintereinander, gibt das eine Kolonne von 900 m.')
    const stats = testStatistics()
    stats.vehicles.total = 1000

    expect(textOf('Stau', stats)).toBe('Stellt man alle 1’000 Fahrzeuge hintereinander, gibt das eine Kolonne von 4,5 km.')
  })

  it('the tower of tyres: four per set, 20 cm each – also a small one', () => {
    expect(textOf('Reifenturm')).toBe('Im Pneuhotel liegen 240 Reifen. Aufeinandergestapelt wäre der Turm 48 m hoch.')
    const stats = testStatistics()
    stats.tires.states = [{ label: 'IN_HOTEL', count: 1 }]

    expect(textOf('Reifenturm', stats)).toBe('Im Pneuhotel liegen 4 Reifen. Aufeinandergestapelt wäre der Turm 0,8 m hoch.')
  })

  it('the oldest vehicle with its age', () => {
    expect(textOf('Oldtimer')).toBe('Das älteste Fahrzeug ist ein Fiat 500 von 1972 – 54 Jahre alt.')
  })
})
