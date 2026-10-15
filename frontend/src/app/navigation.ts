/**
 * Entries of the main navigation. New pages (appointments, …) are added here once they
 * exist – no placeholders for modules that are not built yet.
 */
export interface NavEntry {
  path: string
  /** Visible label (German) */
  title: string
  /** Further pages under this entry – it is marked as active on them too */
  pages?: NavEntry[]
}

/** Shopping list, stock list (FB-08) and suppliers (FB-09) – tabs above the pages (`MaterialTabs`) */
export const materialPages: NavEntry[] = [
  { path: '/shopping', title: 'Einkaufsliste' },
  { path: '/stock', title: 'Lager' },
  { path: '/suppliers', title: 'Lieferanten' },
]

export const navigation: NavEntry[] = [
  { path: '/', title: 'Start' },
  { path: '/tasks', title: 'Termine' },
  { path: '/tasks/new', title: 'Neuer Auftrag' },
  { path: '/courtesy-cars', title: 'Ersatzwagen' },
  { path: '/tires', title: 'Pneuhotel' },
  { path: '/pinboard', title: 'Pinnwand' },
  { path: '/todos', title: 'To-dos' },
  { path: '/shopping', title: 'Material', pages: materialPages },
  { path: '/employees', title: 'Mitarbeiter' },
  { path: '/settings', title: 'Einstellungen' },
  { path: '/system', title: 'System' },
]
