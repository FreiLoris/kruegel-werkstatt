import { Archive, LayoutGrid, MapPin, Plus, Warehouse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { formatDate } from '../../lib/format'
import { MoveDialog } from './MoveDialog'
import { PlaceMap } from './PlaceMap'
import { KINDS, SEASONS, useTireLocations, useTirePlaces, useTireSets, useTreadLimits, type TireSet } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { freeCount, occupancy } from './tirePlaces'
import { searchTireSets } from './tireSetSearch'
import { formatDepth, worstStatus } from './tread'
import { TreadChip } from './TreadDepthsView'

/**
 * The tyre hotel (FB-07): the sets in the hotel, newest first, searched by customer, plate, vehicle
 * or tyres; the places as they are in the workshop (13n); the retrieved ones on their own tab.
 * Search and tab are in the address.
 */
export function TireHotelPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'retrieved' ? 'retrieved' : params.get('view') === 'places' ? 'places' : 'list'
  const retrieved = view === 'retrieved'
  const query = params.get('q') ?? ''
  // e.g. after the takeover from SwissGarage: the sets still to be given a place
  const withoutPlace = params.get('place') === 'none' && !retrieved
  const [assigning, setAssigning] = useState<TireSet | null>(null)
  const sets = useTireSets(!retrieved)
  const locationList = useTireLocations()
  const placeList = useTirePlaces()
  const locations = locationList.data
  const places = placeList.data
  // a list that could not be loaded at all – otherwise the place view would say "Lade …" forever
  const placesFailed = (!locations && locationList.error) || (!places && placeList.error) || (!sets.data && sets.error)
  const free = places && sets.data && !retrieved ? freeCount(places, occupancy(sets.data)) : undefined
  const { data: limits } = useTreadLimits()
  const canEdit = useCanEdit()
  const navigate = useNavigate()

  function change(key: 'view' | 'q' | 'place', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const unplaced = sets.data && !retrieved ? sets.data.filter((s) => !s.placeId).length : 0
  const shown = useMemo(
    () => (sets.data ? searchTireSets(withoutPlace ? sets.data.filter((s) => !s.placeId) : sets.data, query) : []),
    [sets.data, query, withoutPlace],
  )

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1>Pneuhotel</h1>
          {free !== undefined && sets.data && (
            <p className={styles.summary}>
              {sets.data.length} eingelagert · {free} {free === 1 ? 'freier Platz' : 'freie Plätze'}
            </p>
          )}
        </div>
        {canEdit && (
          <Button variant="primary" icon={Plus} onClick={() => navigate('/tires/new')}>
            Einlagern
          </Button>
        )}
      </div>

      <div className={styles.toolbar}>
        {/* the place view shows every place – a search would not narrow it */}
        <div className={styles.search} hidden={view === 'places'}>
          <TextField
            label="Suche"
            type="search"
            placeholder="Kunde, Kontrollschild, Fahrzeug, Reifen …"
            value={query}
            onChange={(e) => change('q', e.target.value)}
          />
        </div>
        <div className={styles.actions} role="group" aria-label="Anzeigen">
          <Button icon={Warehouse} variant={view === 'list' ? 'primary' : 'secondary'} aria-pressed={view === 'list'} onClick={() => change('view', '')}>
            Eingelagert
          </Button>
          <Button icon={LayoutGrid} variant={view === 'places' ? 'primary' : 'secondary'} aria-pressed={view === 'places'} onClick={() => change('view', 'places')}>
            Plätze
          </Button>
          <Button icon={Archive} variant={retrieved ? 'primary' : 'secondary'} aria-pressed={retrieved} onClick={() => change('view', 'retrieved')}>
            Ausgelagert
          </Button>
        </div>
      </div>
      {view === 'list' && (unplaced > 0 || withoutPlace) && (
        <p className={styles.chosen}>
          <Button small icon={MapPin} variant={withoutPlace ? 'primary' : 'secondary'} aria-pressed={withoutPlace} onClick={() => change('place', withoutPlace ? '' : 'none')}>
            Ohne Platz ({unplaced})
          </Button>
          <span className="muted">{withoutPlace ? 'Nur Sätze ohne Lagerplatz – «Zuweisen» wählt ihn.' : 'Sätze ohne Lagerplatz, z. B. aus SwissGarage übernommen.'}</span>
        </p>
      )}

      {view === 'places' ? (
        !locations || !places || !sets.data ? (
          <p className="muted">{placesFailed ? `Konnte nicht geladen werden: ${placesFailed.message}` : 'Lade …'}</p>
        ) : locations.length === 0 ? (
          <p className={styles.empty}>
            Noch keine Standorte – in den <Link to="/settings">Einstellungen</Link> unter «Pneuhotel – Standorte» anlegen.
          </p>
        ) : (
          <PlaceMap locations={locations} places={places} sets={sets.data} limits={limits} mode="view" />
        )
      ) : sets.error ? (
        <p className="muted">Pneuhotel konnte nicht geladen werden: {sets.error.message}</p>
      ) : !sets.data ? (
        <p className="muted">Lade …</p>
      ) : sets.data.length === 0 ? (
        <p className={styles.empty}>{retrieved ? 'Noch nichts ausgelagert.' : 'Noch keine Sätze eingelagert.'}</p>
      ) : (
        <>
          <p className={styles.summary}>
            {shown.length === sets.data.length
              ? `${sets.data.length} ${sets.data.length === 1 ? 'Satz' : 'Sätze'} ${retrieved ? 'ausgelagert' : 'eingelagert'}`
              : `${shown.length} von ${sets.data.length} Sätzen`}
          </p>
          {shown.length === 0 ? (
            <p className={styles.empty}>Nichts gefunden.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={`${styles.table} ${styles.setTable}`}>
                <thead>
                  <tr>
                    {!retrieved && <th>Platz</th>}
                    <th>Kunde / Fahrzeug</th>
                    <th>Satz</th>
                    <th>Profil</th>
                    <th>{retrieved ? 'Ausgelagert' : 'Eingelagert'}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((set) => (
                    <TireSetRow key={set.id} set={set} limits={limits} retrieved={retrieved} onAssign={canEdit ? () => setAssigning(set) : undefined} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {assigning && <MoveDialog set={assigning} onClose={() => setAssigning(null)} />}
    </>
  )
}

function TireSetRow({
  set,
  limits,
  retrieved,
  onAssign,
}: {
  set: TireSet
  limits: ReturnType<typeof useTreadLimits>['data']
  retrieved: boolean
  /** a set without place: choose it right here */
  onAssign?: () => void
}) {
  const lowest = [set.depths.frontLeft, set.depths.frontRight, set.depths.rearLeft, set.depths.rearRight]
    .filter((d): d is number => d !== null && d !== undefined)
    .reduce<number | null>((min, d) => (min === null || d < min ? d : min), null)
  const tyres = [set.brand, set.model, set.dimension].filter(Boolean).join(' ')
  return (
    <tr>
      {!retrieved && (
        <td className={styles.nowrap}>
          {set.place ??
            (onAssign ? (
              <Button small icon={MapPin} onClick={onAssign}>
                Zuweisen
              </Button>
            ) : (
              <span className="muted">offen</span>
            ))}
        </td>
      )}
      {/* two lines per cell instead of more columns – the list fits without scrolling sideways */}
      <td className={styles.owner}>
        <Link to={`/tires/${set.id}`}>{set.customer.displayName}</Link>
        <span className={styles.sub}>
          {set.vehicle ? (
            <>
              {set.vehicle.licensePlate && <LicensePlate text={set.vehicle.licensePlate} size="sm" />} {set.vehicle.description}
            </>
          ) : (
            <span className="muted">Fahrzeug noch offen</span>
          )}
        </span>
      </td>
      <td className={styles.setCell}>
        {SEASONS[set.season]} · {KINDS[set.kind]}
        {tyres && <span className={`${styles.sub} muted`}>{tyres}</span>}
      </td>
      <td className={styles.depth}>
        {/* the lowest wheel counts – the one to talk about */}
        <span className={styles.nowrap}>{formatDepth(lowest)}</span> {limits && <TreadChip status={worstStatus(set.depths, set.season, limits)} />}
      </td>
      <td className={`${styles.nowrap} ${styles.day}`}>{formatDate(retrieved && set.retrievedOn ? set.retrievedOn : set.storedOn)}</td>
    </tr>
  )
}
