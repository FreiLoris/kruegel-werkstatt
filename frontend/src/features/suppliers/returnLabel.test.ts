import { describe, expect, it } from 'vitest'
import type { Company } from '../company/companyApi'
import { detailLines, EMPTY_RETURN, hasRecipientAddress, recipientLines, senderLines } from './returnLabel'
import type { Supplier } from './supplierApi'

// fictitious
const supplier = {
  name: 'Muster Teile AG',
  address: { name: null, street: 'Industriestrasse 1', postalCode: '6000', city: 'Luzern' },
  returnAddress: null,
} as unknown as Supplier
const company = { name: 'Muster Garage', street: 'Werkstrasse 3', postalCode: '8400', city: 'Winterthur' } as Company

describe('returnLabel (FB-31)', () => {
  it('to the supplier – or to its return address, with the supplier name above', () => {
    expect(recipientLines(supplier)).toEqual(['Muster Teile AG', 'Industriestrasse 1', '6000 Luzern'])
    const withReturns = { ...supplier, returnAddress: { name: 'Zentrallager Retouren', street: 'Lagerweg 5', postalCode: '6030', city: 'Ebikon' } }
    expect(recipientLines(withReturns)).toEqual(['Muster Teile AG', 'Zentrallager Retouren', 'Lagerweg 5', '6030 Ebikon'])
  })

  it('says when there is no address to send it to', () => {
    expect(hasRecipientAddress(supplier)).toBe(true)
    expect(hasRecipientAddress({ ...supplier, address: { name: null, street: null, postalCode: null, city: null } })).toBe(false)
  })

  it('we with our customer number', () => {
    expect(senderLines(company, 'K-42')).toEqual(['Muster Garage', 'Werkstrasse 3', '8400 Winterthur', 'Kundennummer K-42'])
    expect(senderLines(company, null)).toHaveLength(3)
  })

  it('only the details typed', () => {
    expect(detailLines(EMPTY_RETURN)).toEqual([])
    expect(detailLines({ ...EMPTY_RETURN, rmaNumber: ' 4711 ', article: 'Bremssattel', articleNumber: '0986', reason: 'defekt' })).toEqual([
      'RMA-Nr. 4711',
      'Artikel: Bremssattel (Nr. 0986)',
      'Grund: defekt',
    ])
  })
})
