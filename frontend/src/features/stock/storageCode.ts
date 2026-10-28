/**
 * The codes written on the shelves (FB-23, scheme of the workshop 2026-10-28): AA00 – the area
 * (K = Keller), the place in it (A, B, C …), the number in that place (01, 02 …). Pure, tested.
 */
export const CODE_PATTERN = /^[A-Z]{2}[0-9]{2}$/

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Typed in: upper case, no spaces */
export const normalizeCode = (text: string) => text.replace(/\s/g, '').toUpperCase()

/**
 * The next free code from what is typed so far:
 * - "K" (an area): the next free place in it – "KB01" when KA… is taken; all 26 taken: on with the
 *   next area letter ("L…")
 * - "KA" (a place): its next free number – "KA03"
 * - nothing or anything else: no proposal
 */
export function suggestCode(typed: string, used: readonly string[]): string | null {
  const start = normalizeCode(typed)
  const taken = new Set(used)
  if (/^[A-Z]{2}/.test(start)) {
    const place = start.slice(0, 2)
    for (let n = 1; n <= 99; n++) {
      const code = place + String(n).padStart(2, '0')
      if (!taken.has(code)) return code
    }
    return null
  }
  if (/^[A-Z]$/.test(start)) {
    for (let area = LETTERS.indexOf(start); area < LETTERS.length; area++) {
      const free = [...LETTERS].find((second) => ![...taken].some((code) => code.startsWith(LETTERS[area] + second)))
      if (free) return `${LETTERS[area]}${free}01`
    }
  }
  return null
}
