import { formatTimestamp } from '../../lib/format'
import { OUTCOMES, type CustomerCall } from './customerCallApi'

/** "Angerufen 28.10.2026 14:05 · nicht erreicht · Reto" – who only when known. Pure, tested. */
export function callText(call: Pick<CustomerCall, 'outcome' | 'calledAt' | 'calledBy'>, nameOf: (id: string) => string | undefined): string {
  const who = call.calledBy ? nameOf(call.calledBy) : undefined
  return [`Angerufen ${formatTimestamp(call.calledAt)}`, OUTCOMES[call.outcome], who].filter(Boolean).join(' · ')
}
