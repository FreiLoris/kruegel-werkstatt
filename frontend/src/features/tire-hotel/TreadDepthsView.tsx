import type { Season, TreadDepths, TreadLimits } from './tireHotelApi'
import { formatDepth, STATUS_TEXT, treadStatus, wheelsToAdvise, WHEELS, type TreadStatus } from './tread'
import styles from './TreadDepths.module.css'

/** ok / ansprechen / unter Minimum / nicht gemessen – colour AND word (also for colour-blind people and screen readers) */
export function TreadChip({ status }: { status: TreadStatus }) {
  return <span className={`${styles.chip} ${styles[status]}`}>{STATUS_TEXT[status]}</span>
}

/** "VL, VR unter Empfehlung – Kunde auf neue Reifen ansprechen." – nothing if all is fine. */
export function AdviseBanner({ depths, season, limits }: { depths: TreadDepths; season: Season; limits: TreadLimits }) {
  const wheels = wheelsToAdvise(depths, season, limits)
  if (wheels.length === 0) return null
  const illegal = WHEELS.some((w) => treadStatus(depths[w.key], season, limits) === 'illegal')
  return (
    <p className={[styles.banner, illegal && styles.illegalBanner].filter(Boolean).join(' ')} role="status">
      <strong>{wheels.join(', ')}</strong> {illegal ? 'teils unter dem gesetzlichen Minimum' : 'unter der Empfehlung'} – Kunde auf neue
      Reifen ansprechen.
    </p>
  )
}

/** The depths of a set around the car, each with its status – read-only (detail page, history). */
export function TreadDepthsView({ depths, season, limits }: { depths: TreadDepths; season: Season; limits: TreadLimits }) {
  return (
    <div className={styles.car}>
      <span className={styles.body} aria-hidden>
        vorne
      </span>
      {WHEELS.map((wheel, index) => (
        <div key={wheel.key} className={[styles.wheel, index % 2 === 1 && styles.right].filter(Boolean).join(' ')}>
          {/* short, the column is narrow – the full name for screen readers and as tooltip */}
          <span className="muted" title={wheel.label}>
            {wheel.short}
            <span className="visually-hidden"> – {wheel.label}</span>
          </span>
          <span className={styles.value}>{formatDepth(depths[wheel.key])}</span>
          <TreadChip status={treadStatus(depths[wheel.key], season, limits)} />
        </div>
      ))}
    </div>
  )
}
