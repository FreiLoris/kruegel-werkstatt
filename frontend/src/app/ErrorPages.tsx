import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import styles from './AppLayout.module.css'

/** For URLs that have no page. */
export function NotFoundPage() {
  return (
    <>
      <h1>Seite nicht gefunden</h1>
      <p className="muted">Diese Adresse gibt es nicht.</p>
      <Link to="/">Zur Startseite</Link>
    </>
  )
}

/**
 * Shown when an unexpected error occurs while rendering a page –
 * instead of a white page.
 */
export function CrashPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unbekannter Fehler'

  return (
    <main className={styles.content}>
      <h1>Etwas ist schiefgelaufen</h1>
      <p className="muted">{message}</p>
      <a href="/">Seite neu laden</a>
    </main>
  )
}
