import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { todayIso } from '../../lib/format'
import { useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { useAbsenceStatistics, type PersonStatistics } from './absenceApi'
import { formatDays, totalsOf, vacationBar, yearFrom } from './absenceStatistics'
import styles from './AbsenceStatisticsView.module.css'

const UNKNOWN_COLOR = '#c8c8c8'

/**
 * The year in numbers (9c, bug #1 / F6): vacation per person against the entitlement, sick days,
 * training, external work per company. Counted on the server in working days; the year stands in
 * the address (`year=`).
 */
export function AbsenceStatisticsView() {
  const [params, setParams] = useSearchParams()
  const currentYear = Number(todayIso().slice(0, 4))
  const year = yearFrom(params.get('year'), currentYear)
  const { data: statistics, error } = useAbsenceStatistics(year)
  const { data: employees } = useAllEmployees()

  function showYear(next: number) {
    const query = new URLSearchParams(params)
    if (next === currentYear) query.delete('year')
    else query.set('year', String(next))
    setParams(query, { replace: true })
  }

  // NameBadge needs a real color (#rrggbb) – neutral grey while the employees are still loading
  const colorOf = (id: string) => employees?.find((e) => e.id === id)?.color ?? UNKNOWN_COLOR
  const nameOf = (id: string) => statistics?.people.find((p) => p.employeeId === id)?.name ?? employees?.find((e) => e.id === id)?.name ?? '?'
  const totals = statistics ? totalsOf(statistics) : null

  return (
    <>
      <div className={styles.toolbar}>
        <Button small variant="ghost" icon={ChevronLeft} onClick={() => showYear(year - 1)} aria-label="Ein Jahr zurück" />
        <h2 className={styles.year} aria-live="polite">
          {year}
        </h2>
        <Button small variant="ghost" icon={ChevronRight} onClick={() => showYear(year + 1)} aria-label="Ein Jahr weiter" />
        <Button small variant="ghost" onClick={() => showYear(currentYear)} disabled={year === currentYear}>
          Dieses Jahr
        </Button>
      </div>

      {error ? (
        <p className={styles.error}>Statistik konnte nicht geladen werden: {error.message}</p>
      ) : !statistics || !totals ? (
        <p className="muted">Lade Statistik …</p>
      ) : (
        <>
          <dl className={styles.figures}>
            <Figure label="Ferientage bezogen" value={formatDays(totals.vacationTaken)} detail={`+ ${formatDays(totals.vacationPlanned)} geplant`} />
            <Figure label="Krankheitstage" value={formatDays(totals.sickDays)} />
            <Figure label="Fremdarbeit" value={`${formatDays(totals.externalWorkDays)} Tage`} detail={`${totals.assignments} Einsätze`} />
            <Figure label="Externe Partner" value={String(totals.companies)} detail={totals.companies === 1 ? 'Firma' : 'Firmen'} />
          </dl>

          <section aria-labelledby="vacation-heading">
            <h3 id="vacation-heading">Pro Person</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th className={styles.number}>Anspruch</th>
                    <th className={styles.number}>Bezogen</th>
                    <th className={styles.number}>Geplant</th>
                    <th className={styles.number}>Übrig</th>
                    <th className={styles.barColumn}>
                      <span className="visually-hidden">Ferien als Balken</span>
                    </th>
                    <th className={styles.number}>Krank</th>
                    <th className={styles.number}>Kurs</th>
                    <th className={styles.number}>Fremdarbeit</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.people.map((person) => (
                    <PersonRow key={person.employeeId} person={person} color={colorOf(person.employeeId)} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="companies-heading">
            <h3 id="companies-heading">Fremdarbeit nach Firma</h3>
            {statistics.companies.length === 0 ? (
              <p className="muted">{year} keine Fremdarbeit erfasst.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Firma</th>
                      <th className={styles.number}>Tage</th>
                      <th className={styles.number}>Einsätze</th>
                      <th>Wer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.companies.map((company) => (
                      <tr key={company.company}>
                        <td>{company.company}</td>
                        <td className={styles.number}>{formatDays(company.days)}</td>
                        <td className={styles.number}>{company.assignments}</td>
                        <td>
                          <span className={styles.badges}>
                            {company.employeeIds.map((id) => (
                              <NameBadge key={id} name={nameOf(id)} color={colorOf(id)} />
                            ))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className={styles.hint}>
            Alle Zahlen in Arbeitstagen (Montag–Freitag ohne Feiertage), halbe Tage zählen 0.5. Bezogen = bis heute, geplant = ab morgen.
          </p>
        </>
      )}
    </>
  )
}

function Figure({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className={styles.figure}>
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
        {detail && <span className={styles.detail}>{detail}</span>}
      </dd>
    </div>
  )
}

function PersonRow({ person, color }: { person: PersonStatistics; color: string }) {
  const bar = vacationBar(person)
  return (
    <tr className={person.active ? undefined : styles.former}>
      <td>
        <NameBadge name={person.name} color={color} />
        {!person.active && <span className={styles.detail}> ausgetreten</span>}
      </td>
      <td className={styles.number}>{person.vacationEntitlement}</td>
      <td className={styles.number}>{formatDays(person.vacationTaken)}</td>
      <td className={styles.number}>{formatDays(person.vacationPlanned)}</td>
      <td className={[styles.number, styles.left, person.vacationLeft < 0 && styles.negative].filter(Boolean).join(' ')}>
        {formatDays(person.vacationLeft)}
      </td>
      <td className={styles.barColumn}>
        <div
          className={[styles.bar, bar.over && styles.over].filter(Boolean).join(' ')}
          role="img"
          aria-label={`${formatDays(person.vacationTaken)} bezogen, ${formatDays(person.vacationPlanned)} geplant von ${person.vacationEntitlement} Tagen`}
        >
          <span className={styles.taken} style={{ width: `${bar.takenPercent}%` }} />
          <span className={styles.planned} style={{ width: `${bar.plannedPercent}%` }} />
        </div>
      </td>
      <td className={styles.number}>{formatDays(person.sickDays)}</td>
      <td className={styles.number}>{formatDays(person.trainingDays)}</td>
      <td className={styles.number}>{formatDays(person.externalWorkDays)}</td>
    </tr>
  )
}
