import type { StockItem } from '../stock/stockApi'
import type { Supplier } from '../suppliers/supplierApi'
import type { ShoppingItem } from './shoppingApi'
import { quantityText } from './shoppingText'

export interface ShoppingGroup {
  /** empty = "Ohne Lieferant" */
  supplier: Supplier | null
  items: ShoppingItem[]
}

/**
 * The open positions by supplier (FB-09: order everything from one supplier at once) – suppliers
 * by name, "Ohne Lieferant" last. A supplier that was deleted meanwhile counts as none.
 */
export function shoppingGroups(items: ShoppingItem[], suppliers: Supplier[]): ShoppingGroup[] {
  const byId = new Map(suppliers.map((s) => [s.id, s]))
  const groups = new Map<string | null, ShoppingItem[]>()
  for (const item of items) {
    const key = item.supplierId && byId.has(item.supplierId) ? item.supplierId : null
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }
  return [...groups.entries()]
    .map(([id, list]) => ({ supplier: id ? byId.get(id)! : null, items: list }))
    .sort((a, b) => {
      if (!a.supplier || !b.supplier) return (a.supplier ? 0 : 1) - (b.supplier ? 0 : 1)
      return a.supplier.name.localeCompare(b.supplier.name, 'de-CH', { sensitivity: 'base' })
    })
}

/** The number to order with: the one entered, else the supplier's for the article, else the article's own */
export function orderNumber(item: ShoppingItem, stock: StockItem[]): string | null {
  if (item.partNumber) return item.partNumber
  const article = item.stockItemId ? stock.find((i) => i.id === item.stockItemId) : undefined
  if (!article) return null
  return article.suppliers.find((s) => s.supplierId === item.supplierId)?.articleNumber ?? article.articleNumber
}

/**
 * The order of one supplier as text to paste into a mail or webshop note (FB-09 nice to have): one
 * line per position with its number and the task it is for, our customer number at the top.
 */
export function orderText(group: ShoppingGroup, stock: StockItem[]): string {
  const lines = group.items.map((item) => {
    const number = orderNumber(item, stock)
    const forTask = item.task && (item.task.taskNumber ? `für Auftrag ${item.task.taskNumber}` : `für ${item.task.customerName}`)
    const extras = [number && `Art.-Nr. ${number}`, forTask].filter(Boolean).join(', ')
    return `- ${quantityText(item)}${extras ? ` (${extras})` : ''}`
  })
  const customer = group.supplier?.customerNumber ? [`Kundennummer: ${group.supplier.customerNumber}`, ''] : []
  return [...customer, ...lines].join('\n')
}
