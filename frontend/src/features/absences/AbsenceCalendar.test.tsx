import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Employee } from '../employees/employeeApi'
import type { Absence } from './absenceApi'
import { AbsenceCalendar } from './AbsenceCalendar'
import { daysOfMonth } from './absenceMonth'

// fictitious
const employees = [
  { id: 'r', name: 'Reto', color: '#f6d860', birthday: '1990-10-15', active: true },
  { id: 'e', name: 'Erich', color: '#9fc8f0', birthday: null, active: true },
] as unknown as Employee[]
const vacation = {
  id: 'a1',
  employeeId: 'r',
  category: 'VACATION',
  company: null,
  note: 'Herbstferien',
  startDate: '2026-10-05',
  startsAfternoon: true,
  endDate: '2026-10-09',
  endsNoon: false,
} as unknown as Absence

const DAY_PX = 40

beforeAll(() => {
  // jsdom has no layout: every track is 31 days × 40 px wide, and pointer capture is a no-op
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 31 * DAY_PX } as DOMRect)
  HTMLElement.prototype.setPointerCapture = () => {}
})

function renderCalendar(canEdit = true) {
  const onSelect = vi.fn()
  const onOpen = vi.fn()
  render(
    <AbsenceCalendar
      employees={employees}
      absences={[vacation]}
      days={daysOfMonth('2026-10')}
      today="2026-10-07"
      holidays={new Map()}
      canEdit={canEdit}
      onSelect={onSelect}
      onOpen={onOpen}
    />,
  )
  return { onSelect, onOpen }
}

/** the empty row area of a person (the track) */
const trackOf = (name: string) => screen.getByText(name).closest('[class*="person"]')!.nextElementSibling as HTMLElement

describe('AbsenceCalendar', () => {
  it('shows an absence as one bar with everything in words, click opens it', () => {
    const { onOpen } = renderCalendar()

    const bar = screen.getByRole('button', { name: 'Reto: Ferien, 05.10.2026 ab Mittag – 09.10.2026 · Herbstferien' })
    // from the afternoon of 5 Oct (half day 9) to the end of 9 Oct (half day 18) out of 62
    expect(bar.style.left).toBe(`${(9 / 62) * 100}%`)
    expect(bar.style.width).toBe(`${(9 / 62) * 100}%`)
    fireEvent.click(bar)
    expect(onOpen).toHaveBeenCalledWith(vacation)
  })

  it('dragging days open in a row gives the person and the period – also leftwards', () => {
    const { onSelect } = renderCalendar()
    const track = trackOf('Erich')

    // from 14 Oct back to 12 Oct (days 13 and 11, zero-based)
    fireEvent.pointerDown(track, { button: 0, pointerId: 1, pointerType: 'mouse', clientX: 13 * DAY_PX + 5, clientY: 5 })
    fireEvent.pointerMove(track, { pointerId: 1, clientX: 11 * DAY_PX + 5, clientY: 5 })
    expect(screen.getByText('12.10. – 14.10.')).toBeTruthy()
    fireEvent.pointerUp(track, { pointerId: 1, clientX: 11 * DAY_PX + 5, clientY: 5 })

    expect(onSelect).toHaveBeenCalledWith('e', '2026-10-12', '2026-10-14')
  })

  it('the outline turns red where the person is already away', () => {
    renderCalendar()
    const track = trackOf('Reto')

    fireEvent.pointerDown(track, { button: 0, pointerId: 1, pointerType: 'mouse', clientX: 2 * DAY_PX + 5, clientY: 5 })
    fireEvent.pointerMove(track, { pointerId: 1, clientX: 5 * DAY_PX + 5, clientY: 5 })

    expect(screen.getByText(/schon abwesend/)).toBeTruthy()
  })

  it('without edit rights nothing can be dragged open, bars still open', () => {
    const { onSelect, onOpen } = renderCalendar(false)
    const track = trackOf('Erich')

    fireEvent.pointerDown(track, { button: 0, pointerId: 1, pointerType: 'mouse', clientX: 5, clientY: 5 })
    fireEvent.pointerUp(track, { pointerId: 1, clientX: 5, clientY: 5 })
    fireEvent.click(screen.getByRole('button', { name: /Reto: Ferien/ }))

    expect(onSelect).not.toHaveBeenCalled()
    expect(onOpen).toHaveBeenCalled()
  })

  it('marks the birthday', () => {
    renderCalendar()

    expect(screen.getByText('Geburtstag Reto')).toBeTruthy()
  })
})
