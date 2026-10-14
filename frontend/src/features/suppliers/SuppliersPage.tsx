import { ExternalLink, Mail, Pencil, Phone, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { MaterialTabs } from '../stock/MaterialTabs'
import { useStockItems } from '../stock/stockApi'
import { useTodos } from '../todos/todoApi'
import { ORDER_CHANNEL_LABEL, useSuppliers, type Supplier } from './supplierApi'
import { SupplierDialog } from './SupplierDialog'
import styles from './SuppliersPage.module.css'

type Dialog = { kind: 'new' } | { kind: 'edit'; supplier: Supplier } | null

/**
 * The suppliers (FB-09) – a tab under "Material". One card each with what is needed to order:
 * order channel, phone, e-mail, webshop, our customer number, delivery rounds. Each card links to
 * its articles in the stock list.
 */
export function SuppliersPage() {
  const canEdit = useCanEdit()
  const suppliers = useSuppliers()
  const { data: items } = useStockItems()
  const { data: shoppingList } = useTodos({ shopping: true })
  const [dialog, setDialog] = useState<Dialog>(null)

  // how many articles each one sells
  const articleCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items ?? []) {
      for (const link of item.suppliers) counts.set(link.supplierId, (counts.get(link.supplierId) ?? 0) + 1)
    }
    return counts
  }, [items])

  // open entries of the shopping list to order from each one (13g)
  const openCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of shoppingList ?? []) {
      if (entry.supplierId) counts.set(entry.supplierId, (counts.get(entry.supplierId) ?? 0) + 1)
    }
    return counts
  }, [shoppingList])

  return (
    <>
      <MaterialTabs />
      <div className={styles.header}>
        <h1>Lieferanten</h1>
        {canEdit && (
          <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'new' })}>
            Lieferant hinzufügen
          </Button>
        )}
      </div>

      {suppliers.error ? (
        <p className="muted">Lieferanten konnten nicht geladen werden: {suppliers.error.message}</p>
      ) : !suppliers.data ? (
        <p className="muted">Lade …</p>
      ) : suppliers.data.length === 0 ? (
        <p className={styles.empty}>Noch keine Lieferanten erfasst.</p>
      ) : (
        <ul className={styles.cards}>
          {suppliers.data.map((supplier) => {
            const count = articleCounts.get(supplier.id) ?? 0
            const open = openCounts.get(supplier.id) ?? 0
            return (
              <li key={supplier.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>{supplier.name}</h2>
                  {supplier.orderChannel && <span className={styles.channel}>{ORDER_CHANNEL_LABEL[supplier.orderChannel]}</span>}
                </div>
                {supplier.contactPerson && <p className="muted">{supplier.contactPerson}</p>}
                <ul className={styles.contact}>
                  {supplier.phone && (
                    <li>
                      <Phone aria-hidden /> <a href={`tel:${supplier.phone.replace(/\s/g, '')}`}>{supplier.phone}</a>
                    </li>
                  )}
                  {supplier.email && (
                    <li>
                      <Mail aria-hidden /> <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                    </li>
                  )}
                  {supplier.webshopUrl && (
                    <li>
                      <ExternalLink aria-hidden />{' '}
                      <a href={supplier.webshopUrl} target="_blank" rel="noopener noreferrer">
                        {supplier.webshopUrl.replace(/^https?:\/\//, '')}
                      </a>
                    </li>
                  )}
                </ul>
                <dl className={styles.facts}>
                  {supplier.customerNumber && (
                    <>
                      <dt>Kundennummer</dt>
                      <dd>{supplier.customerNumber}</dd>
                    </>
                  )}
                  {supplier.delivery && (
                    <>
                      <dt>Lieferung</dt>
                      <dd>{supplier.delivery}</dd>
                    </>
                  )}
                </dl>
                {supplier.remark && <p className={styles.remark}>{supplier.remark}</p>}
                <div className={styles.cardFooter}>
                  <span className={styles.links}>
                    <Link to={`/stock?supplier=${supplier.id}`}>{count === 1 ? '1 Artikel im Lager' : `${count} Artikel im Lager`}</Link>
                    {open > 0 && <Link to="/shopping">{open} auf der Einkaufsliste</Link>}
                  </span>
                  {canEdit && (
                    <Button small icon={Pencil} onClick={() => setDialog({ kind: 'edit', supplier })} aria-label={`${supplier.name} bearbeiten`}>
                      Bearbeiten
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {dialog && (
        <SupplierDialog
          key={dialog.kind === 'new' ? 'new' : dialog.supplier.id}
          supplier={dialog.kind === 'edit' ? dialog.supplier : undefined}
          articleCount={dialog.kind === 'edit' ? (articleCounts.get(dialog.supplier.id) ?? 0) : 0}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
