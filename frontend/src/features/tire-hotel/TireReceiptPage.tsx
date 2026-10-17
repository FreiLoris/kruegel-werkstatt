import { ArrowLeft, Printer } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Fields'
import { formatDate } from '../../lib/format'
import { useCompany, type Company } from '../company/companyApi'
import { KINDS, RIMS, SEASONS, useTireSet, useTreadLimits, type TireSet, type TreadLimits } from './tireHotelApi'
import styles from './TireReceiptPage.module.css'
import { formatDepth, STATUS_TEXT, treadStatus, wheelsToAdvise, WHEELS } from './tread'

/**
 * The storage receipt for the customer (FB-07): the workshop's letterhead, vehicle, the tyres with
 * their depths, place and day – and a field to sign. The hint about worn tyres is printed when
 * there is one (it can be left out). Black on white: it must work on any printer.
 */
export function TireReceiptPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const set = useTireSet(id)
  const company = useCompany()
  const limitList = useTreadLimits()
  const limits = limitList.data
  const [withWarning, setWithWarning] = useState<boolean | null>(null)

  const advise = set.data && limits ? wheelsToAdvise(set.data.depths, set.data.season, limits) : []
  // ticked by itself when there is something to say
  const warning = withWarning ?? advise.length > 0
  const ready = set.data && company.data && limits
  // any list that could not be loaded at all – otherwise "Lade …" would stay forever
  const failed = [set, company, limitList].find((list) => list.error && !list.data)?.error

  return (
    <div className={styles.desk}>
      <div className={styles.toolbar}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(id ? `/tires/${id}` : '/tires')}>
          Zum Satz
        </Button>
        <Checkbox
          label="Profil-Warnung eindrucken"
          checked={warning}
          disabled={advise.length === 0}
          onChange={(e) => setWithWarning(e.target.checked)}
        />
        <Button variant="primary" icon={Printer} disabled={!ready} onClick={() => window.print()}>
          Schein drucken
        </Button>
      </div>
      {!ready && failed ? (
        <p className={styles.message}>Satz konnte nicht geladen werden: {failed.message}</p>
      ) : !ready ? (
        <p className={styles.message}>Lade …</p>
      ) : (
        <Receipt set={set.data} company={company.data} limits={limits} advise={warning ? advise : []} />
      )}
    </div>
  )
}

function Receipt({ set, company, limits, advise }: { set: TireSet; company: Company; limits: TreadLimits; advise: string[] }) {
  const c = set.customer
  const v = set.vehicle
  const address = [c.street, [c.postalCode, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const companyLine = [company.street, [company.postalCode, company.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const companyContact = [company.phone && `Tel. ${company.phone}`, company.email, company.website].filter(Boolean).join(' · ')
  const tyres = [set.brand, set.model, set.dimension].filter(Boolean).join(' ')
  const extras = [set.rims && `${RIMS[set.rims]}felgen`, set.hubCaps && 'Radkappen', set.wheelBolts && 'Radschrauben'].filter(Boolean).join(', ')

  return (
    <article className={styles.sheet} aria-label="Einlagerungsschein">
      <header className={styles.letterhead}>
        {company.logoUrl && <img src={company.logoUrl} alt="" className={styles.logo} />}
        <div className={styles.company}>
          <strong>{company.name}</strong>
          {companyLine && <span>{companyLine}</span>}
          {companyContact && <span>{companyContact}</span>}
        </div>
      </header>

      <h1>Einlagerungsschein Pneuhotel</h1>

      <div className={styles.columns}>
        <section>
          <h2>Kunde</h2>
          <p className={styles.strong}>{c.displayName}</p>
          {address && <p>{address}</p>}
        </section>
        <section>
          <h2>Fahrzeug</h2>
          <p className={styles.strong}>{v ? [v.licensePlate, v.description].filter(Boolean).join(' · ') : '–'}</p>
        </section>
      </div>

      <section>
        <h2>Eingelagert</h2>
        <dl className={styles.facts}>
          <div>
            <dt>Satz</dt>
            <dd>
              {SEASONS[set.season]} · {KINDS[set.kind]}
              {extras && ` · ${extras}`}
            </dd>
          </div>
          {tyres && (
            <div>
              <dt>Reifen</dt>
              <dd>{tyres}</dd>
            </div>
          )}
          {set.year && (
            <div>
              <dt>Jahrgang</dt>
              <dd>{set.year}</dd>
            </div>
          )}
          <div>
            <dt>Lagerplatz</dt>
            <dd>{set.place ?? '______________'}</dd>
          </div>
          <div>
            <dt>Eingelagert am</dt>
            <dd>{formatDate(set.storedOn)}</dd>
          </div>
          {set.remark && (
            <div>
              <dt>Bemerkung</dt>
              <dd>{set.remark}</dd>
            </div>
          )}
        </dl>
      </section>

      <section>
        <h2>Profiltiefe</h2>
        <table className={styles.depths}>
          <thead>
            <tr>
              {WHEELS.map((w) => (
                <th key={w.key}>
                  {w.short} – {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {WHEELS.map((w) => (
                <td key={w.key}>
                  <strong>{formatDepth(set.depths[w.key])}</strong>
                  <span>{STATUS_TEXT[treadStatus(set.depths[w.key], set.season, limits)]}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {advise.length > 0 && (
          <p className={styles.warning}>
            <strong>Hinweis:</strong> Die Profiltiefe {advise.join(', ')} liegt unter der Empfehlung ({SEASONS[set.season]}{' '}
            {formatDepth(set.season === 'SUMMER' ? limits.summerMm : limits.winterMm)}). Wir empfehlen neue Reifen – sprechen Sie uns an.
          </p>
        )}
      </section>

      <div className={styles.signatures}>
        <span>Datum, Unterschrift Kunde</span>
        <span>Datum, Unterschrift {company.name}</span>
      </div>
    </article>
  )
}
