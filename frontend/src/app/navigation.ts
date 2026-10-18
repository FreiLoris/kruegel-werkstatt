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
  // "Material" alone read like the shopping list only – stock and suppliers are behind it too (UX M-15)
  { path: '/shopping', title: 'Material & Lager', pages: materialPages },
  { path: '/employees', title: 'Mitarbeiter' },
  // "System" is for the one who looks after the app – a tile in the settings, not a main entry
  {
    path: '/settings',
    title: 'Einstellungen',
    pages: [
      { path: '/settings/swissgarage', title: 'SwissGarage-Import' },
      { path: '/system', title: 'System' },
    ],
  },
]

/**
 * A "view only" device (the workshop TV) can change nothing – no "Neuer Auftrag", no
 * administration; five entries large enough to hit from the bottom bar (UX M-23).
 */
const VIEW_ONLY_PATHS = ['/', '/tasks', '/tires', '/pinboard', '/todos']
export const viewOnlyNavigation: NavEntry[] = navigation.filter((entry) => VIEW_ONLY_PATHS.includes(entry.path))

/**
 * The name of the page for the browser tab: the most specific entry (or sub page) the path lies in –
 * every tab said only the company's name before (UX, cosmetics). Empty on the start page.
 */
export function pageTitle(pathname: string): string {
  const all = navigation.flatMap((entry) => [entry, ...(entry.pages ?? [])]).filter((entry) => entry.path !== '/')
  const matching = all.filter((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`))
  return matching.sort((a, b) => b.path.length - a.path.length)[0]?.title ?? ''
}
