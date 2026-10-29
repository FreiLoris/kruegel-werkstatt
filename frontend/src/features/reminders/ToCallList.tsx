import { PhoneCall } from 'lucide-react'
import { Link } from 'react-router'
import { PhoneLinks } from '../../components/ui/PhoneLinks'
import { missedReason } from './reminder'
import { useToCall } from './reminderApi'
import styles from './ToCallList.module.css'

/**
 * On the day (17d): customers who are to bring their car and got no SMS the working day before – no
 * mobile number, the SMS failed – so someone calls them.
 */
export function ToCallList({ date }: { date: string }) {
  const { data: toCall } = useToCall(date)
  if (!toCall || toCall.length === 0) return null
  return (
    <section className={styles.list} aria-label="Bitte anrufen – keine SMS-Erinnerung">
      <h3>
        <PhoneCall size={16} aria-hidden /> Bitte anrufen – keine SMS-Erinnerung
      </h3>
      <ul>
        {toCall.map((entry) => (
          <li key={entry.taskId}>
            <Link to={`/tasks/${entry.taskId}`}>{entry.customerName}</Link> <PhoneLinks mobile={entry.mobile} phone={entry.phone} />{' '}
            {entry.outcome !== 'SENT' && <span className="muted">· {missedReason(entry.outcome, entry.error)}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
