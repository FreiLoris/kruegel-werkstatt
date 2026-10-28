import { describe, expect, it } from 'vitest'
import type { Company } from '../company/companyApi'
import { addressLine, detailLines, EMPTY_RETURN, hasRecipientAddress, isSmallLabel, labelFontSize, recipientLines, returnNote, senderLines } from './returnLabel'
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

  it('a return address with only a name is none – the label goes to the own address', () => {
    const nameOnly = { ...supplier, returnAddress: { name: 'Zentrallager', street: null, postalCode: null, city: null } }
    expect(recipientLines(nameOnly)).toEqual(['Muster Teile AG', 'Industriestrasse 1', '6000 Luzern'])
    expect(addressLine(supplier.address)).toBe('Industriestrasse 1, 6000 Luzern')
  })

  it('the text fits the label: smaller on small labels, never tiny', () => {
    expect(isSmallLabel(21)).toBe(true)
    expect(labelFontSize(21, 70)).toBe(3)
    expect(labelFontSize(37, 70)).toBeCloseTo(2.83, 2)
    expect(labelFontSize(297, 210)).toBe(3.4)
    expect(labelFontSize(10, 30)).toBe(1.8)
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

describe('returnNote (FB-31)', () => {
  it('to whom, with number and reason – the article is the position itself', () => {
    expect(returnNote('Muster AG', { ...EMPTY_RETURN, rmaNumber: '4711', article: 'Bremssattel', reason: 'defekt' })).toBe(
      'Retour an Muster AG – RMA-Nr. 4711 · Grund: defekt',
    )
    expect(returnNote('Muster AG', EMPTY_RETURN)).toBe('Retour an Muster AG')
  })
})
