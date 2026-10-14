import type { StockItem } from '../stock/stockApi'
import type { Supplier } from '../suppliers/supplierApi'
import type { Todo } from './todoApi'

export interface ShoppingGroup {
  /** empty = "Ohne Lieferant" */
  supplier: Supplier | null
  entries: Todo[]
}

/**
 * The open shopping list by supplier (FB-09: order everything from one supplier at once) – suppliers
 * by name, "Ohne Lieferant" last. A supplier that was deleted meanwhile counts as none.
 */
export function shoppingGroups(entries: Todo[], suppliers: Supplier[]): ShoppingGroup[] {
  const byId = new Map(suppliers.map((s) => [s.id, s]))
  const groups = new Map<string | null, Todo[]>()
  for (const entry of entries) {
    const key = entry.supplierId && byId.has(entry.supplierId) ? entry.supplierId : null
    const list = groups.get(key)
    if (list) list.push(entry)
    else groups.set(key, [entry])
  }
  return [...groups.entries()]
    .map(([id, list]) => ({ supplier: id ? byId.get(id)! : null, entries: list }))
    .sort((a, b) => {
      if (!a.supplier || !b.supplier) return (a.supplier ? 0 : 1) - (b.supplier ? 0 : 1)
      return a.supplier.name.localeCompare(b.supplier.name, 'de-CH', { sensitivity: 'base' })
    })
}

/** The supplier's number for the article – otherwise the article's own number */
export function orderNumber(entry: Todo, items: StockItem[]): string | null {
  const article = entry.stockItemId ? items.find((i) => i.id === entry.stockItemId) : undefined
  if (!article) return null
  return article.suppliers.find((s) => s.supplierId === entry.supplierId)?.articleNumber ?? article.articleNumber
}

/**
 * The order of one supplier as text to paste into a mail or webshop note (FB-09 nice to have):
 * one line per entry with the article number, our customer number at the top.
 */
export function orderText(group: ShoppingGroup, items: StockItem[]): string {
  const lines = group.entries.map((entry) => {
    const number = orderNumber(entry, items)
    return number ? `- ${entry.text} (Art.-Nr. ${number})` : `- ${entry.text}`
  })
  const customer = group.supplier?.customerNumber ? [`Kundennummer: ${group.supplier.customerNumber}`, ''] : []
  return [...customer, ...lines].join('\n')
}
