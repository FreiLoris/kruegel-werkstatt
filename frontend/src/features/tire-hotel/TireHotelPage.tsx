import { Archive, Plus, Warehouse } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { formatDate } from '../../lib/format'
import { KINDS, SEASONS, useTireSets, useTreadLimits, type TireSet } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { searchTireSets } from './tireSetSearch'
import { formatDepth, worstStatus } from './tread'
import { TreadChip } from './TreadDepthsView'

/**
 * The tyre hotel (FB-07): the sets in the hotel, newest first, searched by customer, plate, vehicle
 * or tyres; the retrieved ones on their own tab. Search and tab are in the address. The storage
 * places (grid, shelves) follow with 13n.
 */
export function TireHotelPage() {
  const [params, setParams] = useSearchParams()
  const retrieved = params.get('view') === 'retrieved'
  const query = params.get('q') ?? ''
  const sets = useTireSets(!retrieved)
  const { data: limits } = useTreadLimits()
  const canEdit = useCanEdit()
  const navigate = useNavigate()

  function change(key: 'view' | 'q', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const shown = useMemo(() => (sets.data ? searchTireSets(sets.data, query) : []), [sets.data, query])

  return (
    <>
      <div className={styles.header}>
        <h1>Pneuhotel</h1>
        {canEdit && (
          <Button variant="primary" icon={Plus} onClick={() => navigate('/tires/new')}>
            Einlagern
          </Button>
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <TextField
            label="Suche"
            type="search"
            placeholder="Kunde, Kontrollschild, Fahrzeug, Reifen …"
            value={query}
            onChange={(e) => change('q', e.target.value)}
          />
        </div>
        <div className={styles.actions} role="group" aria-label="Anzeigen">
          <Button icon={Warehouse} variant={retrieved ? 'secondary' : 'primary'} aria-pressed={!retrieved} onClick={() => change('view', '')}>
            Eingelagert
          </Button>
          <Button icon={Archive} variant={retrieved ? 'primary' : 'secondary'} aria-pressed={retrieved} onClick={() => change('view', 'retrieved')}>
            Ausgelagert
          </Button>
        </div>
      </div>

      {sets.error ? (
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
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Kunde</th>
                    <th>Fahrzeug</th>
                    <th>Satz</th>
                    <th>Reifen</th>
                    <th>Profil</th>
                    <th>{retrieved ? 'Ausgelagert' : 'Eingelagert'}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((set) => (
                    <TireSetRow key={set.id} set={set} limits={limits} retrieved={retrieved} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}

function TireSetRow({ set, limits, retrieved }: { set: TireSet; limits: ReturnType<typeof useTreadLimits>['data']; retrieved: boolean }) {
  const lowest = [set.depths.frontLeft, set.depths.frontRight, set.depths.rearLeft, set.depths.rearRight]
    .filter((d): d is number => d !== null && d !== undefined)
    .reduce<number | null>((min, d) => (min === null || d < min ? d : min), null)
  const tyres = [set.brand, set.model, set.dimension].filter(Boolean).join(' ')
  return (
    <tr>
      <td>
        <Link to={`/tires/${set.id}`}>{set.customer.displayName}</Link>
      </td>
      <td>
        {set.vehicle ? (
          <span className={styles.nowrap}>
            {set.vehicle.licensePlate && <LicensePlate text={set.vehicle.licensePlate} size="sm" />} {set.vehicle.description}
          </span>
        ) : (
          <span className="muted">noch offen</span>
        )}
      </td>
      <td className={styles.nowrap}>
        {SEASONS[set.season]} · {KINDS[set.kind]}
      </td>
      <td>{tyres || <span className="muted">–</span>}</td>
      <td className={styles.nowrap}>
        {/* the lowest wheel counts – the one to talk about */}
        {formatDepth(lowest)} {limits && <TreadChip status={worstStatus(set.depths, set.season, limits)} />}
      </td>
      <td className={styles.nowrap}>{formatDate(retrieved && set.retrievedOn ? set.retrievedOn : set.storedOn)}</td>
    </tr>
  )
}
