import { Check, CircleDashed } from 'lucide-react'
import { Button } from './Button'
import styles from './DoneFilter.module.css'

interface DoneFilterProps {
  done: boolean
  onChange: (done: boolean) => void
  /** how many are open – shown on "Offen" once loaded */
  openCount?: number
}

/**
 * "Offen | Erledigt" – the same filter on the pinboard, the to-dos and the shopping list (FB-04:
 * no tab "Archiv" of its own). The active one filled.
 */
export function DoneFilter({ done, onChange, openCount }: DoneFilterProps) {
  return (
    <div className={styles.group} role="group" aria-label="Filter">
      <Button icon={CircleDashed} variant={done ? 'secondary' : 'primary'} aria-pressed={!done} onClick={() => onChange(false)}>
        Offen
        {openCount !== undefined && <span className={styles.count}>{openCount}</span>}
      </Button>
      <Button icon={Check} variant={done ? 'primary' : 'secondary'} aria-pressed={done} onClick={() => onChange(true)}>
        Erledigt
      </Button>
    </div>
  )
}
