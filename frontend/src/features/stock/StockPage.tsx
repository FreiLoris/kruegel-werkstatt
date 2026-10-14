import { ArrowDownWideNarrow, Pencil, Plus, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useToday } from '../../lib/clock'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Select, TextField } from '../../components/ui/Fields'
import { useSuppliers } from '../suppliers/supplierApi'
import { MaterialTabs } from './MaterialTabs'
import { CATEGORY_LABEL, useStockItems, type StockCategory, type StockItem } from './stockApi'
import { placesWithin, placeTree } from './placeTree'
import { filterStock, NONE, sortStock, type StockLookup, type StockSort } from './stockFilter'
import { StockItemDialog } from './StockItemDialog'
import styles from './StockPage.module.css'
import { useAllStorageLocations } from './storageLocationApi'

type Dialog = { kind: 'new' } | { kind: 'edit'; item: StockItem } | null
type Param = 'q' | 'category' | 'location' | 'supplier' | 'sort'

const SORTS: Record<StockSort, string> = {
  name: 'Bezeichnung',
  category: 'Kategorie',
  quantity: 'Menge',
  location: 'Lagerort',
  supplier: 'Lieferant',
}

/**
 * The stock list (FB-08): a simple list kept by hand – no bookings, no minimum quantities. Search over
 * all fields, filter by category, place and supplier (FB-09), sorted by a column; search, filters and
 * sorting are in the address. Printed as it is filtered, e.g. one shelf for an inventory.
 */
export function StockPage() {
  const [params, setParams] = useSearchParams()
  const canEdit = useCanEdit()
  const items = useStockItems()
  const { data: locations = [] } = useAllStorageLocations()
  const { data: suppliers = [] } = useSuppliers()
  const [dialog, setDialog] = useState<Dialog>(null)
  const today = useToday()

  const query = params.get('q') ?? ''
  const category = (params.get('category') ?? '') as StockCategory | ''
  const location = params.get('location') ?? ''
  const supplier = params.get('supplier') ?? ''
  const sort = (params.get('sort') ?? 'name') as StockSort

  function change(key: Param, value: string) {
    const next = new URLSearchParams(params)
    if (value && !(key === 'sort' && value === 'name')) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const places = useMemo(() => placeTree(locations), [locations])
  const lookup: StockLookup = useMemo(
    () => ({
      locationNames: new Map(places.map((p) => [p.location.id, p.path])),
      locationsWithin: placesWithin(locations),
      locationOrder: new Map(places.map((p, index) => [p.location.id, index])),
      supplierNames: new Map(suppliers.map((s) => [s.id, s.name])),
    }),
    [places, locations, suppliers],
  )
  const shown = useMemo(
    () => (items.data ? sortStock(filterStock(items.data, { query, category, location, supplier }, lookup), sort, lookup) : []),
    [items.data, query, category, location, supplier, lookup, sort],
  )
  // the places to filter by, in tree order: those in use and those an article still lies at
  const filterPlaces = places.filter((p) => p.location.active || items.data?.some((i) => i.storageLocationId === p.location.id))

  const filterText = [
    category && CATEGORY_LABEL[category],
    location && (location === NONE ? 'ohne Lagerort' : lookup.locationNames.get(location)),
    supplier && (supplier === NONE ? 'ohne Lieferant' : lookup.supplierNames.get(supplier)),
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
          {filterPlaces.map((p) => (
            <option key={p.location.id} value={p.location.id}>
              {p.path}
            </option>
          ))}
          <option value={NONE}>ohne Lagerort</option>
        </Select>
        <Select label="Lieferant" value={supplier} onChange={(e) => change('supplier', e.target.value)}>
          <option value="">Alle</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={NONE}>ohne Lieferant</option>
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
                      <td>{item.storageLocationId ? lookup.locationNames.get(item.storageLocationId) : <span className="muted">–</span>}</td>
                      <td>
                        <SupplierCell item={item} names={lookup.supplierNames} />
                      </td>
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
          suppliers={suppliers}
          defaults={{
            category: category || undefined,
            storageLocationId: location && location !== NONE && locations.some((l) => l.id === location && l.active) ? location : undefined,
            supplierId: supplier && supplier !== NONE && suppliers.some((s) => s.id === supplier) ? supplier : undefined,
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}

/** The main supplier with its number for the article; "+ 1" when there are further ones */
function SupplierCell({ item, names }: { item: StockItem; names: Map<string, string> }) {
  const [main, ...further] = item.suppliers
  if (!main) return <span className="muted">–</span>
  return (
    <>
      <div>
        {names.get(main.supplierId)}
        {further.length > 0 && (
          <span className="muted" title={further.map((s) => names.get(s.supplierId)).join(', ')}>
            {' '}
            + {further.length}
          </span>
        )}
      </div>
      {main.articleNumber && <div className={styles.remark}>{main.articleNumber}</div>}
    </>
  )
}
