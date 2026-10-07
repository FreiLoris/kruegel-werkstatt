import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { todayIso } from '../../lib/format'
import { useAllEmployees } from '../employees/employeeApi'
import { usePublicHolidays } from '../publicholidays/publicHolidayApi'
import { ABSENCE_CATEGORY, useAbsences, type Absence, type AbsenceCategory } from './absenceApi'
import { AbsenceCalendar } from './AbsenceCalendar'
import styles from './AbsenceCalendarView.module.css'
import { daysOfMonth, isMonth, monthOf, monthTitle, shiftMonth } from './absenceMonth'
import { AbsenceDialog, type NewAbsence } from './AbsenceDialog'
import { CATEGORY_CLASS } from './categoryColors'

type Dialog = { kind: 'new'; fresh?: NewAbsence } | { kind: 'open'; absence: Absence } | null

/**
 * The month of all people (9b): who is away when. The month stands in the address (`month=`), so
 * the page shows the same after reloading – and always loads, also when coming via the menu (F3).
 */
export function AbsenceCalendarView() {
  const [params, setParams] = useSearchParams()
  const canEdit = useCanEdit()
  const today = todayIso()
  const [dialog, setDialog] = useState<Dialog>(null)

  const requested = params.get('month')
  const month = isMonth(requested) ? requested : monthOf(today)
  const days = daysOfMonth(month)
  const first = days[0]
  const last = days[days.length - 1]
  const absences = useAbsences(first, last)
  // the holidays of exactly this month – the calendar can be paged to any year
  const { data: monthHolidays } = usePublicHolidays(first, last)
  const holidays = useMemo(() => new Map((monthHolidays ?? []).map((h) => [h.date, h.name])), [monthHolidays])
  const { data: employees, error: employeesError } = useAllEmployees()

  // the active people – and anyone who has left but was away in this month (history stays visible)
  const shown = (employees ?? []).filter((e) => e.active || absences.data?.some((a) => a.employeeId === e.id))
  const selectable = (absence?: Absence) => (employees ?? []).filter((e) => e.active || e.id === absence?.employeeId)

  function showMonth(next: string) {
    const query = new URLSearchParams(params)
    if (next === monthOf(today)) query.delete('month')
    else query.set('month', next)
    setParams(query, { replace: true })
  }

  const error = absences.error ?? employeesError

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <Button small variant="ghost" icon={ChevronLeft} onClick={() => showMonth(shiftMonth(month, -1))} aria-label="Ein Monat zurück" />
          <h2 className={styles.title} aria-live="polite">
            {monthTitle(month)}
          </h2>
          <Button small variant="ghost" icon={ChevronRight} onClick={() => showMonth(shiftMonth(month, 1))} aria-label="Ein Monat weiter" />
          <Button small variant="ghost" onClick={() => showMonth(monthOf(today))} disabled={month === monthOf(today)}>
            Heute
          </Button>
        </div>
        <ul className={styles.legend} aria-label="Legende">
          {(Object.keys(ABSENCE_CATEGORY) as AbsenceCategory[]).map((category) => (
            <li key={category} className={CATEGORY_CLASS[category]}>
              <span className={styles.swatch} aria-hidden />
              {ABSENCE_CATEGORY[category]}
            </li>
          ))}
        </ul>
        {canEdit && (
          <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'new' })}>
            Abwesenheit
          </Button>
        )}
      </div>

      {error ? (
        <p className={styles.error}>Kalender konnte nicht geladen werden: {error.message}</p>
      ) : !employees || !absences.data ? (
        <p className="muted">Lade Kalender …</p>
      ) : shown.length === 0 ? (
        <p className="muted">Noch niemand erfasst – unter «Liste» die erste Person anlegen.</p>
      ) : (
        <AbsenceCalendar
          employees={shown}
          absences={absences.data}
          days={days}
          today={today}
          holidays={holidays}
          canEdit={canEdit}
          onSelect={(employeeId, startDate, endDate) => setDialog({ kind: 'new', fresh: { employeeId, startDate, endDate } })}
          onOpen={(absence) => setDialog({ kind: 'open', absence })}
        />
      )}
      <p className={styles.hint}>
        {canEdit && 'Tage in der Zeile einer Person aufziehen = Abwesenheit erfassen (am Tablet kurz halten). '}
        Klick auf einen Balken zeigt die Abwesenheit. Grau = Wochenende oder Feiertag.
      </p>

      {dialog && (
        <AbsenceDialog
          key={dialog.kind === 'open' ? dialog.absence.id : JSON.stringify(dialog.fresh ?? {})}
          absence={dialog.kind === 'open' ? dialog.absence : undefined}
          fresh={dialog.kind === 'new' ? dialog.fresh : undefined}
          employees={selectable(dialog.kind === 'open' ? dialog.absence : undefined)}
          readOnly={!canEdit}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
