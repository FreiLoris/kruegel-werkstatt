/**
 * Entries of the main navigation. New pages (appointments, …) are added here once they
 * exist – no placeholders for modules that are not built yet.
 */
export interface NavEntry {
  path: string
  /** Visible label (German) */
  title: string
}

export const navigation: NavEntry[] = [
  { path: '/', title: 'Start' },
  { path: '/tasks', title: 'Termine' },
  { path: '/tasks/new', title: 'Neuer Auftrag' },
  { path: '/courtesy-cars', title: 'Ersatzwagen' },
  { path: '/pinboard', title: 'Pinnwand' },
  { path: '/employees', title: 'Mitarbeiter' },
  { path: '/settings', title: 'Einstellungen' },
  { path: '/system', title: 'System' },
]
