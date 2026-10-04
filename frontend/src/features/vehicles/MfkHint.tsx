import { CircleAlert, CircleCheck, CircleHelp } from 'lucide-react'
import { formatMonth, todayIso } from '../../lib/format'
import styles from './MfkHint.module.css'
import { mfkState } from './mfk'
import type { Vehicle } from './vehicleApi'

/**
 * Next MFK of a vehicle in words – a warning in words, not only by color.
 * Month precision and "voraussichtlich": the date is an estimate, the office sends the invitation.
 */
export function MfkHint({ vehicle, today = todayIso() }: { vehicle: Pick<Vehicle, 'lastMfk' | 'nextMfk'>; today?: string }) {
  const state = mfkState(vehicle, today)

  switch (state.kind) {
    case 'unknown':
      return (
        <span className={`${styles.hint} ${styles.unknown}`}>
          <CircleHelp aria-hidden /> MFK-Datum unbekannt
        </span>
      )
    case 'overdue':
      return (
        <span className={`${styles.hint} ${styles.overdue}`}>
          <CircleAlert aria-hidden /> MFK überfällig (voraussichtlich seit {formatMonth(state.due)})
        </span>
      )
    case 'soon':
      return (
        <span className={`${styles.hint} ${styles.soon}`}>
          <CircleAlert aria-hidden /> MFK bald fällig (voraussichtlich {formatMonth(state.due)})
        </span>
      )
    case 'ok':
      return (
        <span className={`${styles.hint} ${styles.ok}`}>
          <CircleCheck aria-hidden /> Nächste MFK voraussichtlich {formatMonth(state.due)}
        </span>
      )
  }
}
