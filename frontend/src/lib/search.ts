/**
 * One way to compare search text in the browser – the same rule as `search_fold` in the database
 * (V40), so every search forgives alike (UX G-04): lower case, accents off ("Bösch" = "bosch",
 * "Françoise" = "francoise", "Yılmaz" = "yilmaz", ß = ss), ae/oe/ue = a/o/u ("Boesch" = "Bösch"),
 * and no - . / ( ) ' + _ ("ZH-445566" = "ZH 445566" without the space, "Müller-Meier").
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .replace(/ø/g, 'o')
    .replace(/đ/g, 'd')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[-./()'+_]/g, '')
}

/** The typed words, folded – "  Huber  ZH-12 " → ["huber", "zh12"]; none = no search */
export function searchWords(query: string): string[] {
  return query.split(/\s+/).map(fold).filter(Boolean)
}

/** Every word occurs somewhere in the texts – the rule of all searches of the app */
export function matchesAll(words: string[], texts: (string | null | undefined)[]): boolean {
  if (words.length === 0) return true
  const haystack = fold(texts.filter(Boolean).join(' '))
  return words.every((word) => haystack.includes(word))
}
