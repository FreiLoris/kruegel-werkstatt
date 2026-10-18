import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { LicensePlate } from '../components/licenseplate/LicensePlate'
import { MIN_SEARCH_LENGTH, useCustomerSearch } from '../features/customers/customerSearchApi'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import styles from './CustomerQuickSearch.module.css'

/**
 * "Kunde suchen" in the header (UX G-05): name, phone, plate … → the customer page. Before, a
 * customer could only be looked up by starting a new task. "/" jumps into the field; arrows and
 * Enter choose, Esc closes.
 */
export function CustomerQuickSearch() {
  const navigate = useNavigate()
  const listId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const query = useDebouncedValue(text)
  const search = useCustomerSearch(query, 8)
  // a vehicle without known holder has no customer page
  const hits = (search.data?.hits ?? []).flatMap((hit) => (hit.customer ? [{ customer: hit.customer, vehicles: hit.vehicles }] : []))
  const showList = open && text.trim().length >= MIN_SEARCH_LENGTH

  useEffect(() => {
    const jump = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key !== '/' || target.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', jump)
    return () => window.removeEventListener('keydown', jump)
  }, [])

  function choose(id: string) {
    setOpen(false)
    setText('')
    input.current?.blur()
    navigate(`/customers/${id}`)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'ArrowDown' && hits.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, hits.length - 1))
    } else if (event.key === 'ArrowUp' && hits.length > 0) {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && showList && hits[active]) {
      event.preventDefault()
      choose(hits[active].customer.id)
    }
  }

  return (
    <div className={styles.search}>
      <Search aria-hidden className={styles.icon} />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Kunde suchen"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
        placeholder="Kunde suchen  /"
        maxLength={100}
        autoComplete="off"
        className={styles.input}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // after a click on a hit – the click comes first
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <div className={styles.panel}>
          {search.error ? (
            <p className={styles.message}>Suche fehlgeschlagen: {search.error.message}</p>
          ) : !search.data ? (
            <p className={styles.message}>Suche …</p>
          ) : hits.length === 0 ? (
            <p className={styles.message}>Kein Kunde für «{query.trim()}».</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Kunden" className={styles.hits}>
              {hits.map(({ customer, vehicles }, index) => (
                <li
                  key={customer.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={index === active ? `${styles.hit} ${styles.active}` : styles.hit}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(customer.id)}
                >
                  <strong>{customer.displayName}</strong>
                  <span className="muted">{[customer.city, customer.mobile ?? customer.phone].filter(Boolean).join(' · ')}</span>
                  {vehicles[0]?.licensePlate && <LicensePlate text={vehicles[0].licensePlate} size="sm" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
