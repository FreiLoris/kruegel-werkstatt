import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import styles from './AppLayout.module.css'

/** Für URLs, zu denen es keine Seite gibt. */
export function NichtGefundenSeite() {
  return (
    <>
      <h1>Seite nicht gefunden</h1>
      <p className="gedaempft">Diese Adresse gibt es nicht.</p>
      <Link to="/">Zur Startseite</Link>
    </>
  )
}

/**
 * Wird angezeigt, wenn beim Darstellen einer Seite ein unerwarteter Fehler auftritt –
 * statt einer weissen Seite.
 */
export function AbsturzSeite() {
  const fehler = useRouteError()
  const meldung = isRouteErrorResponse(fehler)
    ? `${fehler.status} ${fehler.statusText}`
    : fehler instanceof Error
      ? fehler.message
      : 'Unbekannter Fehler'

  return (
    <main className={styles.inhalt}>
      <h1>Etwas ist schiefgelaufen</h1>
      <p className="gedaempft">{meldung}</p>
      <a href="/">Seite neu laden</a>
    </main>
  )
}
