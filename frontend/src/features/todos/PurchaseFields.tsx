import { Select } from '../../components/ui/Fields'
import { useStockItems } from '../stock/stockApi'
import { useSuppliers } from '../suppliers/supplierApi'

export interface Purchase {
  stockItemId: string
  supplierId: string
  text: string
}

/**
 * What to buy and where – only for an entry of the shopping list (13g). Choosing an article from
 * the stock list fills in its main supplier (FB-09: "bei Lagerartikeln automatisch vorbelegt") and,
 * if still empty, the text. Both stay optional: coffee and milk need neither.
 */
export function PurchaseFields({ value, onChange }: { value: Purchase; onChange: (value: Purchase) => void }) {
  const { data: items = [] } = useStockItems()
  const { data: suppliers = [] } = useSuppliers()
  const mainSupplier = (id: string) => items.find((i) => i.id === id)?.suppliers[0]?.supplierId ?? ''

  function chooseArticle(stockItemId: string) {
    const article = items.find((i) => i.id === stockItemId)
    // the supplier follows the article – unless one was chosen by hand
    const supplierFollows = value.supplierId === '' || value.supplierId === mainSupplier(value.stockItemId)
    onChange({
      stockItemId,
      supplierId: supplierFollows ? (stockItemId ? mainSupplier(stockItemId) : '') : value.supplierId,
      text: value.text.trim() === '' && article ? article.name : value.text,
    })
  }

  return (
    <>
      <Select label="Artikel aus dem Lager" value={value.stockItemId} onChange={(e) => chooseArticle(e.target.value)}>
        <option value="">–</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </Select>
      <Select label="Lieferant" value={value.supplierId} onChange={(e) => onChange({ ...value, supplierId: e.target.value })}>
        <option value="">–</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
    </>
  )
}
