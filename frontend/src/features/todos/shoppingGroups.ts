import { fold } from '../../lib/search'
import type { StockItem } from '../stock/stockApi'
import type { Supplier } from '../suppliers/supplierApi'
import type { AnyTask } from '../tasks/taskApi'
import type { Todo } from './todoApi'

export interface ShoppingGroup {
  /** empty = "Ohne Lieferant" */
  supplier: Supplier | null
  entries: Todo[]
  /** material of tasks still to order from this supplier – same order, one mail (UX G-18) */
  parts: AnyTask[]
}

/**
 * The task material of a supplier: the task names its supplier as text ("Teilehandel"), so it is
 * matched by name, forgiving case and umlauts.
 */
export function partsOf(supplier: Supplier, tasks: AnyTask[]): AnyTask[] {
  const name = fold(supplier.name.trim())
  return tasks.filter((task) => task.parts?.supplier && fold(task.parts.supplier.trim()) === name)
}

/**
 * The open shopping list by supplier (FB-09: order everything from one supplier at once) – suppliers
 * by name, "Ohne Lieferant" last. A supplier that was deleted meanwhile counts as none.
 */
export function shoppingGroups(entries: Todo[], suppliers: Supplier[], tasks: AnyTask[] = []): ShoppingGroup[] {
  const byId = new Map(suppliers.map((s) => [s.id, s]))
  const groups = new Map<string | null, Todo[]>()
  for (const entry of entries) {
    const key = entry.supplierId && byId.has(entry.supplierId) ? entry.supplierId : null
    const list = groups.get(key)
    if (list) list.push(entry)
    else groups.set(key, [entry])
  }
  // a supplier with only task material gets its group too
  for (const supplier of suppliers) {
    if (!groups.has(supplier.id) && partsOf(supplier, tasks).length > 0) groups.set(supplier.id, [])
  }
  return [...groups.entries()]
    .map(([id, list]) => {
      const supplier = id ? byId.get(id)! : null
      return { supplier, entries: list, parts: supplier ? partsOf(supplier, tasks) : [] }
    })
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
  const parts = group.parts.map((task) => `- ${task.parts!.description} (für ${task.taskNumber ? `Auftrag ${task.taskNumber}` : task.customer.displayName})`)
  const customer = group.supplier?.customerNumber ? [`Kundennummer: ${group.supplier.customerNumber}`, ''] : []
  return [...customer, ...lines, ...parts].join('\n')
}
