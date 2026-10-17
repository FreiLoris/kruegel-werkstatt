const PHONE = /^\+?[\d\s/().-]+$/

/**
 * What was typed in the customer search, taken into a new customer (UX M-06): a phone number goes
 * to "Handy" – everything else is usually the name.
 */
export function prefillFromSearch(text: string): { lastName: string; mobile: string } {
  const typed = text.trim()
  const digits = typed.replace(/\D/g, '')
  return PHONE.test(typed) && digits.length >= 6 ? { lastName: '', mobile: typed } : { lastName: typed, mobile: '' }
}

/** A phone number: digits, spaces and + / ( ) . - only – "079 abc" is a typo (UX M-06) */
export function phoneError(text: string): string | undefined {
  const typed = text.trim()
  if (typed === '') return undefined
  return PHONE.test(typed) && /\d/.test(typed) ? undefined : 'Nur Ziffern, Leerzeichen und + / ( ) -'
}
