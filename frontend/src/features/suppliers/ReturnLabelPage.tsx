import { ArrowLeft, Printer } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Select, TextField } from '../../components/ui/Fields'
import { useCompany, type Company } from '../company/companyApi'
import { useShoppingItem } from '../shopping/shoppingApi'
import { spots, spotsFrom, startPositions } from '../tire-hotel/labelSheet'
import { useLabelFormats, type LabelFormat } from '../tire-hotel/tireHotelApi'
import { detailLines, EMPTY_RETURN, hasRecipientAddress, recipientLines, RETURN_REASONS, senderLines, type ReturnDetails } from './returnLabel'
import styles from './ReturnLabelPage.module.css'
import { useSuppliers, type Supplier } from './supplierApi'

/** A whole sheet for the parcel – or one label of a sheet from the settings */
type Paper = 'A5' | 'A4' | string

/**
 * A return label for a supplier (FB-31): to its return address (else its own), from us with our
 * customer number, with RMA, delivery note or invoice, article and reason – all optional. On a
 * whole A5 or A4 page for the parcel, or on one label of a sheet (start position as for the tyre
 * labels). From a position of the shopping list (`?item=`) its article and number come along.
 * Outside the app frame, so only the paper is printed.
 */
export function ReturnLabelPage() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const suppliers = useSuppliers()
  const company = useCompany()
  const formats = useLabelFormats()
  const item = useShoppingItem(search.get('item') ?? undefined)
  const supplier = suppliers.data?.find((s) => s.id === id)

  const [paper, setPaper] = useState<Paper>('A5')
  const [start, setStart] = useState(1)
  // the article of the position as a suggestion – typed over freely
  const [typed, setTyped] = useState<Partial<ReturnDetails>>({})
  const details: ReturnDetails = {
    ...EMPTY_RETURN,
    article: item.data?.description ?? '',
    articleNumber: item.data?.partNumber ?? '',
    ...typed,
  }
  const set = (field: keyof ReturnDetails, value: string) => setTyped({ ...typed, [field]: value })

  const format = formats.data?.find((f) => f.id === paper)
  const starts = format ? startPositions(format, 1) : []
  const back = item.data ? `/shopping/${item.data.id}` : '/suppliers'

  return (
    <div className={styles.desk}>
      <div className={styles.toolbar}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(back)}>
          Zurück
        </Button>
        <Select
          label="Papier"
          value={paper}
          onChange={(e) => {
            setPaper(e.target.value)
            setStart(1)
          }}
        >
          <option value="A5">A5 ganze Seite (Paket)</option>
          <option value="A4">A4 ganze Seite</option>
          {formats.data?.map((f) => (
            <option key={f.id} value={f.id}>
              Etikett: {f.name}
            </option>
          ))}
        </Select>
        {format && (
          <Select label="Etikett Nr. (angebrochener Bogen)" value={String(start)} onChange={(e) => setStart(Number(e.target.value))}>
            {starts.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        )}
        <Button variant="primary" icon={Printer} disabled={!supplier || !company.data} onClick={() => window.print()}>
          Drucken
        </Button>
      </div>
      <div className={styles.fields}>
        <TextField label="RMA- / Rücksende-Nr." maxLength={40} value={details.rmaNumber} onChange={(e) => set('rmaNumber', e.target.value)} />
        <TextField label="Lieferschein / Rechnung" maxLength={40} value={details.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} />
        <TextField label="Artikel" maxLength={80} value={details.article} onChange={(e) => set('article', e.target.value)} />
        <TextField label="Nummer" maxLength={40} value={details.articleNumber} onChange={(e) => set('articleNumber', e.target.value)} />
        <Select label="Grund" value={details.reason} onChange={(e) => set('reason', e.target.value)}>
          <option value="">–</option>
          {RETURN_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </Select>
      </div>

      {suppliers.error || company.error ? (
        <p className={styles.message}>Konnte nicht geladen werden: {(suppliers.error ?? company.error)?.message}</p>
      ) : !suppliers.data || !company.data ? (
        <p className={styles.message}>Lade …</p>
      ) : !supplier ? (
        <p className={styles.message}>Diesen Lieferanten gibt es nicht (mehr).</p>
      ) : (
        <>
          {!hasRecipientAddress(supplier) && (
            <p className={styles.warning} role="alert">
              Für {supplier.name} ist keine Adresse erfasst – unter <Link to="/suppliers">Lieferanten</Link> beim Bearbeiten ergänzen.
            </p>
          )}
          {format ? (
            <LabelSheet format={format} start={start} onPickStart={setStart}>
              <Label supplier={supplier} company={company.data} details={details} />
            </LabelSheet>
          ) : (
            <article className={paper === 'A4' ? styles.a4 : styles.a5} aria-label="Rücksende-Etikett">
              <Label supplier={supplier} company={company.data} details={details} />
            </article>
          )}
        </>
      )}
    </div>
  )
}

/** Recipient big, sender small above it, the details below – the same on a page and on a label */
function Label({ supplier, company, details }: { supplier: Supplier; company: Company; details: ReturnDetails }) {
  const lines = detailLines(details)
  return (
    <div className={styles.label}>
      <p className={styles.sender}>
        <span className={styles.caption}>Absender</span>
        {senderLines(company, supplier.customerNumber).join(' · ')}
      </p>
      <p className={styles.recipient}>
        <span className={styles.caption}>Empfänger</span>
        {recipientLines(supplier).map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
      {lines.length > 0 && (
        <p className={styles.details}>
          <span className={styles.caption}>Rücksendung</span>
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      )}
    </div>
  )
}

/** One label of an A4 sheet from the settings: the start position tapped or chosen, the others faint */
function LabelSheet({ format, start, onPickStart, children }: { format: LabelFormat; start: number; onPickStart: (n: number) => void; children: React.ReactNode }) {
  const size = (spot: { left: number; top: number }): CSSProperties => ({
    left: `${spot.left}mm`,
    top: `${spot.top}mm`,
    width: `${format.widthMm}mm`,
    height: `${format.heightMm}mm`,
  })
  const [spot] = spotsFrom(format, start, 1)
  return (
    <article className={styles.sheet} aria-label="Etikettenbogen">
      {spots(format)
        .filter((s) => s.position !== start)
        .map((s) => (
          <button key={s.position} type="button" className={styles.empty} style={size(s)} onClick={() => onPickStart(s.position)} aria-label={`Auf Etikett ${s.position} drucken`}>
            {s.position}
          </button>
        ))}
      {spot && (
        <section className={styles.onSheet} style={size(spot)}>
          {children}
        </section>
      )}
    </article>
  )
}
