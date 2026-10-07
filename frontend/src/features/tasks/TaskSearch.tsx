import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToday } from '../../lib/clock'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { formatDate, formatTime } from '../../lib/format'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useTaskSearch, type Task } from './taskApi'
import styles from './TaskSearch.module.css'
import { TaskStatusBadge } from './TaskStatusBadge'

/**
 * Search over ALL appointments (F11: the old search only looked at the visible week, without
 * saying that there were hits elsewhere). A hit opens its day.
 */
export function TaskSearch({ onOpen }: { onOpen: (task: Task) => void }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const query = useDebouncedValue(input, 250)
  const search = useTaskSearch(query)
  const root = useRef<HTMLDivElement>(null)
  const today = useToday()

  // a click somewhere else closes the list
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const showList = open && query.trim().length >= 2

  function choose(task: Task) {
    setOpen(false)
    setInput('')
    onOpen(task)
  }

  return (
    <div className={styles.search} ref={root}>
      <label className={styles.field}>
        <Search aria-hidden />
        <span className="visually-hidden">Termine durchsuchen</span>
        <input
          type="search"
          placeholder="Alle Termine durchsuchen …"
          autoComplete="off"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          aria-expanded={showList}
          aria-controls="task-search-hits"
        />
      </label>

      {showList && (
        <div className={styles.panel} id="task-search-hits">
          {search.error ? (
            <p className={styles.message}>Suche fehlgeschlagen: {search.error.message}</p>
          ) : !search.data ? (
            <p className={styles.message}>Suche …</p>
          ) : search.data.hits.length === 0 ? (
            <p className={styles.message}>Keine Termine für «{query.trim()}».</p>
          ) : (
            <>
              <p className={styles.message}>
                {search.data.hits.length}
                {search.data.more ? '+' : ''} Treffer – kommende zuerst
              </p>
              <ul className={styles.hits}>
                {search.data.hits.map((task) => (
                  <li key={task.id}>
                    <button type="button" className={[styles.hit, task.date < today && styles.past].filter(Boolean).join(' ')} onClick={() => choose(task)}>
                      <span className={styles.when}>
                        {WEEKDAYS_SHORT[weekdayOf(task.date)]} {formatDate(task.date)}, {formatTime(task.time)}
                      </span>
                      <span className={styles.who}>{task.customer.displayName}</span>
                      <span className={styles.what}>
                        {task.vehicle?.licensePlate && <LicensePlate text={task.vehicle.licensePlate} size="sm" />}
                        {task.vehicle?.description}
                        <TaskStatusBadge status={task.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {search.data.more && <p className={styles.message}>Weitere Treffer – mehr Wörter eingeben.</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
