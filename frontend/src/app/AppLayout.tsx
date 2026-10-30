import { Wrench } from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useEffect } from 'react'
import { useCompany } from '../features/company/companyApi'
import { useActiveEmployees } from '../features/employees/employeeApi'
import styles from './AppLayout.module.css'
import { KioskClock } from './kiosk/KioskClock'
import { useBackToDashboard } from './kiosk/useBackToDashboard'
import { CustomerQuickSearch } from './CustomerQuickSearch'
import { ConnectionLost } from './live/ConnectionLost'
import { LiveIndicator } from './live/LiveIndicator'
import { useLiveUpdates } from './live/useLiveUpdates'
import { navigation, pageTitle, viewOnlyNavigation, type NavEntry } from './navigation'
import { useModulesOn } from '../features/modules/moduleApi'
import { useScreenLockSettings } from '../features/screenlock/screenLockApi'
import { LockScreen } from './person/LockScreen'
import { PersonMenu } from './person/PersonMenu'
import { PersonPicker } from './person/PersonPicker'
import { useDevicePerson } from './person/useDevicePerson'
import { useIdleMode } from '../lib/deviceIdleMode'
import { choose } from '../lib/devicePerson'
import { useIdleLock } from './person/useIdleLock'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'

/**
 * Frame of every page: header with navigation, below it the page content.
 * `<Outlet />` is where the router inserts the current page.
 *
 * If the device has not said yet who uses it, the person picker appears instead of the page.
 *
 * The workshop TV ("view only") shows the dashboard full screen: no header, the navigation, date,
 * time and live status at the bottom (10a), larger and with more contrast (10c). Every other
 * device keeps the normal header there too. On another page the TV returns to the dashboard by
 * itself after a while without touch.
 */
export function AppLayout() {
  const liveStatus = useLiveUpdates()
  const device = useDevicePerson()
  const { pathname } = useLocation()
  const { data: active = [] } = useActiveEmployees()
  const { data: company } = useCompany()
  const idleMode = useIdleMode()
  // "Nur ansehen" on the shared workshop tablet (FB-29) is no TV: header with the person to switch to,
  // no kiosk, and it stays on its page (a half-typed task is not thrown away by going back)
  const tv = device.kind === 'viewOnly' && idleMode !== 'viewOnly'
  const kiosk = tv && pathname === '/'
  // neutral 4: a new installation is set up first – every page leads there until done or skipped
  const needsSetup = company?.setUp === false && device.kind !== 'viewOnly' && pathname !== '/setup'
  useBackToDashboard(tv && pathname !== '/')
  const moduleOn = useModulesOn()
  // neutral 3: the parts the workshop switched off are not in the menu
  const links = (device.kind === 'viewOnly' ? viewOnlyNavigation : navigation).filter((entry) => moduleOn(entry.module))
  // FB-29: after some minutes without use the device asks who is at it – not the TV ("Nur ansehen");
  // the shared workshop tablet falls back to "Nur ansehen" silently instead, as set per device
  const { data: lockSettings, isError: lockSettingsMissing } = useScreenLockSettings()
  // not loaded: the 5 minutes of the workshop rather than never
  const lock = useIdleLock(lockSettings?.lockMinutes ?? (lockSettingsMissing ? 5 : 0), device.kind === 'person' && idleMode !== 'never')
  useEffect(() => {
    if (lock.locked && idleMode === 'viewOnly') choose({ kind: 'viewOnly' })
  }, [lock.locked, idleMode])

  // Browser tab and bookmarks carry the page and the workshop's name: "Pneuhotel – Garage Muster"
  useEffect(() => {
    const name = company?.name ?? 'Werkstatt'
    const page = pageTitle(pathname)
    document.title = page ? `${page} – ${name}` : name
  }, [company, pathname])

  if (kiosk) {
    return (
      // data-kiosk: larger text and stronger contrast (tokens.css)
      <div className={styles.kiosk} data-kiosk>
        {/* always there – the grid rows count on three children */}
        <div>
          <ConnectionLost status={liveStatus} />
        </div>
        <main className={styles.kioskContent}>
          <Outlet />
        </main>
        <nav className={styles.bottomNav} aria-label="Hauptnavigation">
          <MainLinks entries={links} />
          <span className={styles.status}>
            <KioskClock />
            <LiveIndicator status={liveStatus} />
          </span>
        </nav>
      </div>
    )
  }

  return (
    <>
      <header className={styles.header}>
        {/* name and logo from the settings (company profile) */}
        <Link to="/" className={styles.brand}>
          {company?.logoUrl ? <img src={company.logoUrl} alt="" className={styles.logo} /> : <Wrench aria-hidden />}
          {company?.name ?? 'Werkstatt'}
        </Link>
        <nav className={styles.nav} aria-label="Hauptnavigation">
          <MainLinks entries={links} />
        </nav>
        {device.kind === 'person' && <CustomerQuickSearch />}
        <PersonMenu status={device} active={active} />
        <LiveIndicator status={liveStatus} />
      </header>
      <ConnectionLost status={liveStatus} />
      <main className={styles.content}>
        {device.kind === 'choose' ? (
          <PersonPicker active={active} noLongerActive={device.noLongerActive !== undefined} />
        ) : needsSetup ? (
          <Navigate to="/setup" replace />
        ) : (
          <Outlet />
        )}
      </main>
      <UnsavedChangesGuard />
      {lock.locked && idleMode === 'lock' && <LockScreen active={active} onChosen={lock.unlock} />}
      {/* a new page starts at its top (or at #section), back returns to where one was – by path:
          a filter or a search typed into the address must not jump to the top */}
      <ScrollRestoration getKey={(location) => location.pathname} />
    </>
  )
}

/** The pages of the app – in the header, or at the bottom on the TV */
function MainLinks({ entries }: { entries: NavEntry[] }) {
  const { pathname } = useLocation()
  return entries.map((entry) => {
    // An entry with its own, longer path wins: on "/tasks/new" only "Neuer Auftrag" is active, not "Termine" too
    const moreSpecific = navigation.some(
      (other) => other !== entry && isOnPage(other.path, entry.path) && isOnPage(pathname, other.path),
    )
    return (
      <NavLink
        key={entry.path}
        to={entry.path}
        // "end": home link only active for exactly "/", not for every sub page
        end={entry.path === '/' || moreSpecific}
        className={({ isActive }) =>
          isActive || entry.pages?.some((page) => isOnPage(pathname, page.path)) ? `${styles.link} ${styles.active}` : styles.link
        }
      >
        {entry.title}
      </NavLink>
    )
  })
}

/** Is `pathname` the page `path` or one of its sub pages? (Like NavLink: "/stock" matches "/stock/1", not "/stockx".) */
function isOnPage(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}
