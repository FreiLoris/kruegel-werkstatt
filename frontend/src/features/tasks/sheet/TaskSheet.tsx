import type { ReactNode } from 'react'
import { formatCount, formatDate, formatLocalDateTime, formatMonth, formatTime, formatTimestamp } from '../../../lib/format'
import type { Company } from '../../company/companyApi'
import type { Task } from '../taskApi'
import { workItems } from '../workSummary'
import styles from './TaskSheet.module.css'

export interface SheetLookups {
  /** name per service item ID */
  serviceItemNames: ReadonlyMap<string, string>
  mechanicName?: string
  liftName?: string
}

/**
 * The printed task sheet for the mechanic: white paper, the company's letterhead, customer with
 * address, vehicle, appointment and EVERY ticked piece of work as a checklist (F1 – the old sheet
 * only printed the free text). Text only, no app colors: it must work on a black-and-white printer.
 */
export function TaskSheet({ task, company, lookups }: { task: Task; company: Company; lookups: SheetLookups }) {
  const c = task.customer
  const v = task.vehicle
  const items = workItems(task, lookups.serviceItemNames)
  const address = [c.addition, c.street, [c.postalCode, c.city].filter(Boolean).join(' ')].filter(Boolean)
  const companyLine = [company.street, [company.postalCode, company.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const companyContact = [company.phone && `Tel. ${company.phone}`, company.email, company.website].filter(Boolean).join(' · ')

  return (
    <article className={styles.sheet} aria-label="Auftragszettel">
      <header className={styles.letterhead}>
        {company.logoUrl && <img src={company.logoUrl} alt="" className={styles.logo} />}
        <div className={styles.company}>
          <strong>{company.name}</strong>
          {companyLine && <span>{companyLine}</span>}
          {companyContact && <span>{companyContact}</span>}
        </div>
      </header>

      <div className={styles.titleRow}>
        <h1>Auftragszettel</h1>
        <div className={styles.number}>
          <span>Auftrags-Nr.</span>
          <strong>{task.taskNumber ?? '________'}</strong>
        </div>
      </div>

      <div className={styles.columns}>
        <Block title="Kunde">
          <p className={styles.strong}>{c.displayName}</p>
          {address.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <Facts
            rows={[
              ['Handy', c.mobile],
              ['Telefon', c.phone],
              ['E-Mail', c.email],
            ]}
          />
        </Block>

        <Block title="Fahrzeug">
          {v ? (
            <>
              <p className={styles.strong}>
                {v.licensePlate ?? 'ohne Kennzeichen'} · {v.description}
              </p>
              <Facts
                rows={[
                  ['Jahrgang', v.modelYear?.toString()],
                  ['Kilometer', v.mileageKm !== null ? `${formatCount(v.mileageKm)} km` : null],
                  ['Chassis-Nr.', v.vin],
                  ['Farbe', v.color],
                  ['Treibstoff', v.fuel],
                  ['Letzte MFK', v.lastMfk ? formatDate(v.lastMfk) : null],
                  ['Nächste MFK', v.nextMfk ? `ca. ${formatMonth(v.nextMfk)}` : null],
                ]}
              />
              <p className={styles.writeIn}>Km bei Eingang: ____________</p>
            </>
          ) : (
            <>
              <p className={styles.strong}>Fahrzeug noch offen</p>
              <p className={styles.writeIn}>Kennzeichen: ____________ Marke/Typ: ____________________</p>
            </>
          )}
        </Block>
      </div>

      <Block title="Termin">
        <Facts
          rows={[
            ['Termin', `${formatDate(task.date)}, ${formatTime(task.time)}`],
            ['Kommt früher', task.arrivesEarlier ? formatLocalDateTime(task.arrivesEarlier) : null],
            ['Fertig bis', task.readyBy ? formatLocalDateTime(task.readyBy) : null],
            ['Wartekunde', task.waitingCustomer ? 'Ja – Kunde wartet vor Ort' : null],
            ['Mechaniker', lookups.mechanicName ?? 'noch offen'],
            ['Lift', lookups.liftName ?? 'noch offen'],
          ]}
        />
      </Block>

      <Block title="Arbeiten">
        {items.length === 0 && !task.workDescription ? (
          <p>Keine Arbeiten angegeben.</p>
        ) : (
          <ul className={styles.checklist}>
            {items.map((item) => (
              <li key={item.label}>
                <span className={styles.box} aria-hidden />
                <span>
                  {item.label}
                  {item.detail && <span className={styles.detail}> – {item.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {task.workDescription && <p className={styles.freeText}>{task.workDescription}</p>}
      </Block>

      {task.notes && (
        <Block title="Notizen">
          <p className={styles.freeText}>{task.notes}</p>
        </Block>
      )}

      <Block title="Bemerkungen Werkstatt">
        <div className={styles.lines} aria-hidden />
      </Block>

      <footer className={styles.footer}>
        <span>Visum Mechaniker: ____________________</span>
        <span>Erfasst am {formatTimestamp(task.createdAt)}</span>
      </footer>
    </article>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.block}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

/** Label/value rows; empty values are left out. */
function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  const filled = rows.filter((row): row is [string, string] => !!row[1])
  if (filled.length === 0) return null
  return (
    <dl className={styles.facts}>
      {filled.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
