import type { Company } from '../company/companyApi'
import type { Supplier, SupplierAddress } from './supplierApi'

/** Why something goes back (FB-31) */
export const RETURN_REASONS = ['falsch geliefert', 'defekt', 'Altteil', 'Pfand', 'sonstiges'] as const

/** What is typed for one return – all optional */
export interface ReturnDetails {
  rmaNumber: string
  documentNumber: string
  article: string
  articleNumber: string
  reason: string
}

export const EMPTY_RETURN: ReturnDetails = { rmaNumber: '', documentNumber: '', article: '', articleNumber: '', reason: '' }

const postalLine = (a: Pick<SupplierAddress, 'postalCode' | 'city'>) => [a.postalCode, a.city].filter(Boolean).join(' ')

const hasPlace = (a: SupplierAddress | null | undefined): a is SupplierAddress => !!a && !!(a.street || a.postalCode || a.city)

/**
 * Who gets the parcel: the return address if the supplier has one, else its own address – always
 * with the supplier's name, the return address' name below it ("Zentrallager Retouren").
 */
export function recipientLines(supplier: Supplier): string[] {
  const target = hasPlace(supplier.returnAddress) ? supplier.returnAddress : supplier.address
  return [supplier.name, target === supplier.returnAddress ? supplier.returnAddress?.name : null, target.street, postalLine(target)].filter(
    (line): line is string => !!line,
  )
}

/** Without a street or place the parcel cannot go – the page says so */
export const hasRecipientAddress = (supplier: Supplier) => hasPlace(supplier.returnAddress) || hasPlace(supplier.address)

/** We: name, street, postal code and city, our customer number with this supplier */
export function senderLines(company: Company, customerNumber: string | null): string[] {
  return [company.name, company.street, postalLine(company), customerNumber && `Kundennummer ${customerNumber}`].filter(
    (line): line is string => !!line,
  )
}

/** "RMA-Nr. 4711", "Lieferschein / Rechnung 12345", "Artikel: Bremssattel (Nr. 0986)", "Grund: defekt" – only what was typed */
export function detailLines(d: ReturnDetails): string[] {
  const article = [d.article.trim(), d.articleNumber.trim() && `(Nr. ${d.articleNumber.trim()})`].filter(Boolean).join(' ')
  return [
    d.rmaNumber.trim() && `RMA-Nr. ${d.rmaNumber.trim()}`,
    d.documentNumber.trim() && `Lieferschein / Rechnung ${d.documentNumber.trim()}`,
    article && `Artikel: ${article}`,
    d.reason && `Grund: ${d.reason}`,
  ].filter((line): line is string => !!line)
}
