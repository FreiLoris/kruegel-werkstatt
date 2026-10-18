import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import type { TireLocation, TirePlace, TireSet, TreadLimits } from './tireHotelApi'
import styles from './PlaceMap.module.css'
import { columnLetter, freeCount, occupancy, placesAt, shortName } from './tirePlaces'
import { worstStatus } from './tread'

interface PlaceMapProps {
  locations: TireLocation[]
  places: TirePlace[]
  /** the sets in the hotel – they name their place */
  sets: TireSet[]
  limits?: TreadLimits
  /** view: a taken place opens its set. pick: a free place is chosen. */
  mode: 'view' | 'pick'
  selected?: string | null
  onPick?: (place: TirePlace) => void
  /** moving a set: its own place is marked */
  currentSetId?: string
}

/**
 * The places of the tyre hotel as they are in the workshop (FB-07): a floor grid (columns A, B, … ×
 * rows, the sets of a field on top of each other) or shelves (levels from the top down ×
 * compartments). Free, taken (with the customer) and taken with worn tyres ("ansprechen") at a
 * glance; one tab per location.
 */
export function PlaceMap({ locations, places, sets, limits, mode, selected, onPick, currentSetId }: PlaceMapProps) {
  const taken = occupancy(sets)
  const selectedLocation = places.find((p) => p.id === selected)?.locationId
  const [chosen, setChosen] = useState<string | undefined>(undefined)
  const locationId = chosen ?? selectedLocation ?? locations[0]?.id
  const location = locations.find((l) => l.id === locationId)
  if (!location) return null

  const own = placesAt(places, location.id)
  const at = new Map(own.map((p) => [`${p.a}/${p.b}/${p.c}`, p]))
  const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

  /** One place – a function, not a component: it is drawn anew with the map, never kept on its own */
  function slot(a: number, b: number, c: number, label: string) {
    const key = `${a}/${b}/${c}`
    const place = at.get(key)
    if (!place) return <span key={key} className={styles.slot} />
    const set = taken.get(place.id)
    const tread = set && limits ? worstStatus(set.depths, set.season, limits) : 'unknown'
    // below the legal minimum red, "ansprechen" orange – both with a sign, not the border alone (UX M-20)
    const worn = tread === 'advise' || tread === 'illegal'
    const classes = [
      styles.slot,
      set ? styles.taken : styles.free,
      worn && styles.worn,
      tread === 'illegal' && styles.illegal,
      place.id === selected && styles.selected,
      set && set.id === currentSetId && styles.current,
    ]
      .filter(Boolean)
      .join(' ')
    const text = set ? `${worn ? '! ' : ''}${shortName(set.customer.displayName)}` : 'frei'
    const treadText = tread === 'illegal' ? ' · abgefahren' : tread === 'advise' ? ' · Profil ansprechen' : ''
    const title = `${place.address}${set ? ` · ${set.customer.displayName}${set.vehicle?.licensePlate ? ` · ${set.vehicle.licensePlate}` : ''}${treadText}` : ' · frei'}`
    if (mode === 'view' && set) {
      return (
        <Link key={key} to={`/tires/${set.id}`} className={classes} title={title}>
          <span className={styles.slotLabel}>{label}</span> {text}
        </Link>
      )
    }
    if (mode === 'pick' && !set) {
      return (
        <button key={key} type="button" className={classes} title={title} aria-pressed={place.id === selected} onClick={() => onPick?.(place)}>
          <span className={styles.slotLabel}>{label}</span> {place.id === selected ? 'gewählt' : text}
        </button>
      )
    }
    return (
      <span key={key} className={classes} title={title}>
        <span className={styles.slotLabel}>{label}</span> {set && set.id === currentSetId ? 'hier' : text}
      </span>
    )
  }

  return (
    <div className={styles.map}>
      {locations.length > 1 && (
        <div className={styles.tabs} role="group" aria-label="Standort">
          {locations.map((l) => (
            <Button key={l.id} variant={l.id === location.id ? 'primary' : 'secondary'} aria-pressed={l.id === location.id} onClick={() => setChosen(l.id)}>
              {l.code} – {l.name}
              <span className={styles.count}>{freeCount(placesAt(places, l.id), taken)} frei</span>
            </Button>
          ))}
        </div>
      )}

      <div className={styles.scroller}>
        {location.kind === 'FLOOR' ? (
          // columns A, B, … across, rows down; the sets of a trolley on top of each other
          <div className={styles.grid} style={{ gridTemplateColumns: `2rem repeat(${location.sizeA}, minmax(6.5rem, 1fr))` }}>
            <span />
            {range(location.sizeA).map((a) => (
              <span key={a} className={styles.head}>
                {columnLetter(a)}
              </span>
            ))}
            {range(location.sizeB).map((b) => (
              <Row key={b} label={String(b)}>
                {range(location.sizeA).map((a) => (
                  <div key={a} className={styles.cell} aria-label={`${location.code}-${columnLetter(a)}${b}`}>
                    {range(location.sizeC).map((c) => slot(a, b, c, location.sizeC > 1 ? String(c) : ''))}
                  </div>
                ))}
              </Row>
            ))}
          </div>
        ) : (
          <div className={styles.shelves}>
            {range(location.sizeA).map((a) => (
              <section key={a} className={styles.shelf} aria-label={`Regal ${a}`}>
                <h3 className={styles.shelfTitle}>Regal {a}</h3>
                <div className={styles.grid} style={{ gridTemplateColumns: `2.5rem repeat(${location.sizeC}, minmax(6.5rem, 1fr))` }}>
                  <span />
                  {range(location.sizeC).map((c) => (
                    <span key={c} className={styles.head}>
                      F{c}
                    </span>
                  ))}
                  {/* the top level on top, like the real shelf */}
                  {range(location.sizeB)
                    .reverse()
                    .map((b) => (
                      <Row key={b} label={`E${b}`}>
                        {range(location.sizeC).map((c) => (
                          <div key={c} className={styles.cell}>
                            {slot(a, b, c, '')}
                          </div>
                        ))}
                      </Row>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <p className={styles.legend}>
        <span className={`${styles.key} ${styles.free}`}>frei</span>
        <span className={`${styles.key} ${styles.taken}`}>belegt</span>
        <span className={`${styles.key} ${styles.taken} ${styles.worn}`}>! belegt, Profil ansprechen</span>
        <span className={`${styles.key} ${styles.taken} ${styles.worn} ${styles.illegal}`}>! belegt, abgefahren</span>
        {/* the labels in the cells: compartment, e.g. "A3" = row A, place 3 */}
      </p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className={styles.head}>{label}</span>
      {children}
    </>
  )
}
