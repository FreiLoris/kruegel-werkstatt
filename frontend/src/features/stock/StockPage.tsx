import { ArrowDownWideNarrow, Pencil, Plus, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useToday } from '../../lib/clock'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Select, TextField } from '../../components/ui/Fields'
import { MaterialTabs } from './MaterialTabs'
import { CATEGORY_LABEL, useStockItems, type StockCategory, type StockItem } from './stockApi'
import { filterStock, NO_LOCATION, sortStock, type StockSort } from './stockFilter'
import { StockItemDialog } from './StockItemDialog'
import styles from './StockPage.module.css'
import { useAllStorageLocations } from './storageLocationApi'

type Dialog = { kind: 'new' } | { kind: 'edit'; item: StockItem } | null

const SORTS: Record<StockSort, string> = { name: 'Bezeichnung', category: 'Kategorie', quantity: 'Menge', location: 'Lagerort' }

/**
 * The stock list (FB-08): a simple list kept by hand – no bookings, no minimum quantities. Search over
 * all fields, filter by category and place, sorted by a column; search, filters and sorting are in the
 * address. Printed as it is filtered, e.g. one shelf for an inventory.
 */
export function StockPage() {
  const [params, setParams] = useSearchParams()
  const canEdit = useCanEdit()
  const items = useStockItems()
  const { data: locations = [] } = useAllStorageLocations()
  const [dialog, setDialog] = useState<Dialog>(null)
  const today = useToday()

  const query = params.get('q') ?? ''
  const category = (params.get('category') ?? '') as StockCategory | ''
  const location = params.get('location') ?? ''
  const sort = (params.get('sort') ?? 'name') as StockSort

  function change(key: 'q' | 'category' | 'location' | 'sort', value: string) {
    const next = new URLSearchParams(params)
    if (value && !(key === 'sort' && value === 'name')) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const names = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations])
  const order = useMemo(() => new Map(locations.map((l, index) => [l.id, index])), [locations])
  const shown = useMemo(
    () => (items.data ? sortStock(filterStock(items.data, { query, category, location }, names), sort, order) : []),
    [items.data, query, category, location, names, sort, order],
  )
  // the places to filter by: those in use and those an article still lies at
  const filterLocations = locations.filter((l) => l.active || items.data?.some((i) => i.storageLocationId === l.id))

  const filterText = [
    category && CATEGORY_LABEL[category],
    location && (location === NO_LOCATION ? 'ohne Lagerort' : names.get(location)),
    query && `Suche «${query}»`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <MaterialTabs />
      <div className={styles.header}>
        <h1>Lager</h1>
        <div className={styles.actions}>
          <Button icon={Printer} onClick={() => window.print()} disabled={shown.length === 0}>
            Drucken
          </Button>
          {canEdit && (
            <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'new' })}>
              Artikel hinzufügen
            </Button>
          )}
        </div>
      </div>
      {/* on paper: what was printed and when – for the inventory */}
      <p className={styles.printOnly}>
        {filterText || 'Alle Artikel'} · Stand {formatDate(today)}
      </p>

      <div className={styles.filters}>
        <TextField
          label="Suche"
          type="search"
          placeholder="Bezeichnung, Nummer, Hersteller, …"
          value={query}
          onChange={(e) => change('q', e.target.value)}
          className={styles.search}
        />
        <Select label="Kategorie" value={category} onChange={(e) => change('category', e.target.value)}>
          <option value="">Alle</option>
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select label="Lagerort" value={location} onChange={(e) => change('location', e.target.value)}>
          <option value="">Alle</option>
          {filterLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
          <option value={NO_LOCATION}>ohne Lagerort</option>
        </Select>
      </div>

      {items.error ? (
        <p className="muted">Lagerliste konnte nicht geladen werden: {items.error.message}</p>
      ) : !items.data ? (
        <p className="muted">Lade …</p>
      ) : items.data.length === 0 ? (
        <p className={styles.empty}>
          Noch keine Artikel erfasst.
          {locations.length === 0 && (
            <>
              {' '}
              Lagerorte (Regal, Fach, …) werden in den <Link to="/settings">Einstellungen</Link> erfasst.
            </>
          )}
        </p>
      ) : (
        <>
          <p className={styles.summary}>
            {shown.length === items.data.length ? `${items.data.length} Artikel` : `${shown.length} von ${items.data.length} Artikeln`}
          </p>
          {shown.length === 0 ? (
            <p className={styles.empty}>Nichts gefunden.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {(Object.keys(SORTS) as StockSort[]).map((key) => (
                      <th key={key} aria-sort={sort === key ? 'ascending' : undefined} className={key === 'quantity' ? styles.number : undefined}>
                        <button type="button" className={styles.sort} onClick={() => change('sort', key)}>
                          {SORTS[key]}
                          {sort === key && <ArrowDownWideNarrow aria-hidden />}
                        </button>
                      </th>
                    ))}
                    <th>Artikelnr. / Hersteller</th>
                    {canEdit && (
                      <th className={styles.noPrint}>
                        <span className={styles.srOnly}>Aktionen</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.name}>{item.name}</div>
                        {item.remark && <div className={styles.remark}>{item.remark}</div>}
                      </td>
                      <td>{CATEGORY_LABEL[item.category]}</td>
                      <td className={styles.number}>{item.quantity ?? <span className="muted">–</span>}</td>
                      <td>{item.storageLocationId ? names.get(item.storageLocationId) : <span className="muted">–</span>}</td>
                      <td>
                        {[item.articleNumber, item.manufacturer].filter(Boolean).join(' · ') || <span className="muted">–</span>}
                      </td>
                      {canEdit && (
                        <td className={`${styles.rowActions} ${styles.noPrint}`}>
                          <Button small icon={Pencil} onClick={() => setDialog({ kind: 'edit', item })} aria-label={`${item.name} bearbeiten`}>
                            Bearbeiten
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {dialog && (
        <StockItemDialog
          key={dialog.kind === 'new' ? 'new' : dialog.item.id}
          item={dialog.kind === 'edit' ? dialog.item : undefined}
          locations={locations}
          defaults={{
            category: category || undefined,
            storageLocationId: location && location !== NO_LOCATION && locations.some((l) => l.id === location && l.active) ? location : undefined,
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
