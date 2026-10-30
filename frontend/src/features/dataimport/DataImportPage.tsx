import { DataImport } from './DataImport'

/**
 * Customers and vehicles from another program (neutral 5) – for a workshop that does not work with
 * SwissGarage. A move: what is taken over is edited in the app afterwards.
 */
export function DataImportPage() {
  return (
    <>
      <h1>Kunden und Fahrzeuge übernehmen</h1>
      <p className="muted">
        Im bisherigen Programm Kunden (und Fahrzeuge) als CSV- oder Excel-Datei exportieren und hier hochladen. Danach
        sagen, welche Spalte was ist – zuerst kommt ein Probelauf, gespeichert wird erst mit «Jetzt übernehmen». Was die App
        schon hat, wird nicht doppelt angelegt.
      </p>
      <h2>Aus einem anderen Programm</h2>
      <DataImport />
    </>
  )
}
