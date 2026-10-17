/**
 * A whole number as it was typed – never changed silently (UX G-09): "2,5" used to become 25 in a
 * number field. Empty is fine (the caller decides whether it is required).
 *
 * @returns the German message for the field, or undefined when the text is empty or a whole number
 */
export function wholeNumberError(text: string, max?: number): string | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  if (!/^\d+$/.test(trimmed)) return /^\d+[.,]\d*$/.test(trimmed) ? 'Nur ganze Zahlen – ohne Komma' : 'Nur Ziffern'
  if (max !== undefined && Number(trimmed) > max) return `Höchstens ${max}`
  return undefined
}
