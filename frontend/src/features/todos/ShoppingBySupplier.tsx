import { Copy, ExternalLink, Phone } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '../../components/ui/Button'
import { copyText } from '../../lib/clipboard'
import { useToast } from '../../components/ui/toastContext'
import { useStockItems } from '../stock/stockApi'
import { ORDER_CHANNEL_LABEL, useSuppliers } from '../suppliers/supplierApi'
import { orderNumber, orderText, shoppingGroups } from './shoppingGroups'
import styles from './ShoppingBySupplier.module.css'
import type { Todo } from './todoApi'
import { TodoItem } from './TodoItem'

/**
 * The open shopping list grouped by supplier (FB-09) – order everything from one at once: how to
 * order (channel, phone, webshop) in the heading, the supplier's article number at each entry and
 * "Bestellung kopieren" for a mail or the webshop.
 */
export function ShoppingBySupplier({ entries, canEdit, showAssignee }: { entries: Todo[]; canEdit: boolean; showAssignee: boolean }) {
  const { data: suppliers = [] } = useSuppliers()
  const { data: items = [] } = useStockItems()
  const toast = useToast()
  const groups = useMemo(() => shoppingGroups(entries, suppliers), [entries, suppliers])

  async function copy(text: string, name: string) {
    try {
      await copyText(text)
      toast.success(`Bestellung für ${name} kopiert`)
    } catch {
      toast.error('Kopieren ist in diesem Browser nicht erlaubt')
    }
  }

  return groups.map((group) => {
    const { supplier } = group
    const name = supplier?.name ?? 'Ohne Lieferant'
    return (
      <section key={supplier?.id ?? 'none'} className={styles.group} aria-label={name}>
        <header className={styles.header}>
          <h2>
            {name} <span className="muted">{group.entries.length}</span>
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
              <Button small variant="ghost" icon={Copy} onClick={() => void copy(orderText(group, items), name)}>
                Bestellung kopieren
              </Button>
            </span>
          )}
        </header>
        <ul className={styles.list}>
          {group.entries.map((entry) => {
            const number = orderNumber(entry, items)
            return (
              <TodoItem
                key={entry.id}
                todo={entry}
                canEdit={canEdit}
                showTask
                withShopping
                showAssignee={showAssignee && entry.assigneeId !== null}
                detail={number && `Art.-Nr. ${number}`}
              />
            )
          })}
        </ul>
      </section>
    )
  })
}
