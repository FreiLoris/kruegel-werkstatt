import { Copy, ExternalLink, Phone } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { copyText } from '../../lib/clipboard'
import { useStockItems } from '../stock/stockApi'
import { ORDER_CHANNEL_LABEL, useSuppliers } from '../suppliers/supplierApi'
import type { ShoppingItem } from './shoppingApi'
import styles from './ShoppingBySupplier.module.css'
import { orderNumber, orderText, shoppingGroups } from './shoppingGroups'
import { ShoppingTable } from './ShoppingTable'

/**
 * The open positions grouped by supplier (FB-09) – order everything from one at once: how to order
 * (channel, phone, webshop) in the heading, the number to order with at each position and
 * "Bestellung kopieren" for a mail or the webshop.
 */
export function ShoppingBySupplier({ items, canEdit }: { items: ShoppingItem[]; canEdit: boolean }) {
  const { data: suppliers = [] } = useSuppliers()
  const { data: stock = [] } = useStockItems()
  const toast = useToast()
  const groups = useMemo(() => shoppingGroups(items, suppliers), [items, suppliers])

  async function copy(text: string, name: string) {
    try {
      await copyText(text)
      toast.success(`Bestellung für ${name} kopiert`)
    } catch {
      toast.error('Kopieren ist in diesem Browser nicht erlaubt')
    }
  }

  return groups.map(({ supplier, items: ofSupplier }) => {
    const name = supplier?.name ?? 'Ohne Lieferant'
    return (
      <section key={supplier?.id ?? 'none'} className={styles.group} aria-label={name}>
        <header className={styles.header}>
          <h2>
            {name} <span className="muted">{ofSupplier.length}</span>
          </h2>
          {supplier && (
            <span className={styles.how}>
              {supplier.orderChannel && <span className={styles.channel}>{ORDER_CHANNEL_LABEL[supplier.orderChannel]}</span>}
              {supplier.phone && (
                <a href={`tel:${supplier.phone.replace(/\s/g, '')}`}>
                  <Phone aria-hidden /> {supplier.phone}
                </a>
              )}
              {supplier.webshopUrl && (
                <a href={supplier.webshopUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden /> Webshop
                </a>
              )}
              <Button small variant="ghost" icon={Copy} onClick={() => void copy(orderText({ supplier, items: ofSupplier }, stock), name)}>
                Bestellung kopieren
              </Button>
            </span>
          )}
        </header>
        <ShoppingTable
          items={ofSupplier}
          canEdit={canEdit}
          showTask
          label={name}
          // the supplier's number when none was entered
          detailOf={(item) => (item.partNumber ? null : orderNumber(item, stock) && `Art.-Nr. ${orderNumber(item, stock)}`)}
        />
      </section>
    )
  })
}
