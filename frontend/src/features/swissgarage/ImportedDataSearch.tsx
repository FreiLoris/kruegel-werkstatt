import { useState } from 'react'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { TextField } from '../../components/ui/Fields'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { MIN_SEARCH_LENGTH, useCustomerSearch, type CustomerSearchHit } from '../customers/customerSearchApi'
import styles from './ImportedDataSearch.module.css'

/**
 * Look into the data: search customers and vehicles like the order wizard will.
 * Shows that the import arrived – without loading thousands of rows at once.
 */
export function ImportedDataSearch() {
  const [input, setInput] = useState('')
  const query = useDebouncedValue(input)
  const search = useCustomerSearch(query)
  const tooShort = query.trim().length < MIN_SEARCH_LENGTH

  return (
    <>
      <TextField
        label="Kunden und Fahrzeuge durchsuchen"
        hint="Name, Firma, Ort, Telefon, Kennzeichen, Marke … – mehrere Wörter grenzen ein"
        type="search"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        className={styles.field}
      />

      {tooShort ? null : search.error ? (
        <p className="muted">Suche fehlgeschlagen: {search.error.message}</p>
      ) : !search.data ? (
        <p className="muted">Suche …</p>
      ) : search.data.hits.length === 0 ? (
        <p className="muted">Keine Treffer für «{query.trim()}».</p>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Kunde</th>
                  <th>Adresse</th>
                  <th>Telefon</th>
                  <th>Fahrzeuge</th>
                </tr>
              </thead>
              <tbody>
                {search.data.hits.map((hit) => (
                  <HitRow key={hit.customer?.id ?? hit.vehicles[0]?.id} hit={hit} />
                ))}
              </tbody>
            </table>
          </div>
          {search.data.more && (
            <p className="muted">Es gibt weitere Treffer – mehr Wörter eingeben, um einzugrenzen.</p>
          )}
        </>
      )}
    </>
  )
}

function HitRow({ hit }: { hit: CustomerSearchHit }) {
  const c = hit.customer
  return (
    <tr>
      <td>
        {c ? (
          <>
            <span className={styles.name}>{c.displayName}</span>
            <span className={styles.sub}>
              {c.source === 'SWISSGARAGE' ? `Nr. ${c.swissgarageNumber}` : 'nur in der App erfasst'}
            </span>
          </>
        ) : (
          <span className="muted">Halter unbekannt</span>
        )}
      </td>
      <td>{c && [c.street, [c.postalCode, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</td>
      <td>{c && (c.mobile ?? c.phone)}</td>
      <td>
        <ul className={styles.vehicles}>
          {hit.vehicles.map((v) => (
            <li key={v.id}>
              {v.licensePlate ? <LicensePlate text={v.licensePlate} size="sm" /> : <span className="muted">ohne Kennzeichen</span>}
              <span>{v.description}</span>
            </li>
          ))}
        </ul>
      </td>
    </tr>
  )
}
