/**
 * Einträge der Hauptnavigation. Neue Seiten (Mitarbeiter, Termine, ...) werden hier
 * ergänzt, sobald es sie gibt – keine Platzhalter für noch nicht gebaute Module.
 */
export interface NavEintrag {
  pfad: string
  titel: string
}

export const navigation: NavEintrag[] = [
  { pfad: '/', titel: 'Start' },
  { pfad: '/mitarbeiter', titel: 'Mitarbeiter' },
  { pfad: '/einstellungen', titel: 'Einstellungen' },
  { pfad: '/system', titel: 'System' },
]
