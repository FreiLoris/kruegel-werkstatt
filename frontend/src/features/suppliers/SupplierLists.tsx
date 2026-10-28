import { Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { Button } from '../../components/ui/Button'
import { Checkbox, TextField } from '../../components/ui/Fields'
import styles from './SupplierDialog.module.css'
import { DELIVERY_KINDS } from './supplierDeliveries'
import { emptyContact, emptyDelivery, type ContactForm, type DeliveryForm } from './supplierForm'

/** Departments and people of a supplier (FB-30) – as many as needed */
export function ContactsEditor({
  contacts,
  onChange,
  errorAt,
}: {
  contacts: ContactForm[]
  onChange: (contacts: ContactForm[]) => void
  /** the message for a field of row i */
  errorAt: (index: number, field: keyof ContactForm) => string | undefined
}) {
  const set = (index: number, field: keyof ContactForm, value: string) =>
    onChange(contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  return (
    <fieldset className={styles.list}>
      <legend>Ansprechpartner</legend>
      {contacts.length === 0 && <p className="muted">Noch keine – z. B. Verkauf Innendienst, Werkzeuge, Reifen, Buchhaltung.</p>}
      {contacts.map((c, i) => (
        <div key={c.rowId} className={styles.entry} role="group" aria-label={`Ansprechpartner ${i + 1}`}>
          <div className={styles.row}>
            <TextField
              label="Abteilung / Funktion"
              maxLength={100}
              placeholder="z. B. Reifen"
              value={c.department}
              onChange={(e) => set(i, 'department', e.target.value)}
              error={errorAt(i, 'department')}
            />
            <TextField label="Name" maxLength={100} value={c.name} onChange={(e) => set(i, 'name', e.target.value)} error={errorAt(i, 'name')} />
          </div>
          <div className={styles.row3}>
            <TextField label="Direktwahl" type="tel" maxLength={40} value={c.phone} onChange={(e) => set(i, 'phone', e.target.value)} error={errorAt(i, 'phone')} />
            <TextField label="Mobile" type="tel" maxLength={40} value={c.mobile} onChange={(e) => set(i, 'mobile', e.target.value)} error={errorAt(i, 'mobile')} />
            <TextField label="E-Mail" type="email" maxLength={100} value={c.email} onChange={(e) => set(i, 'email', e.target.value)} error={errorAt(i, 'email')} />
          </div>
          <div className={styles.entryFoot}>
            <TextField label="Bemerkung" maxLength={300} value={c.remark} onChange={(e) => set(i, 'remark', e.target.value)} error={errorAt(i, 'remark')} />
            <Button small variant="ghost" icon={Trash2} aria-label={`Ansprechpartner ${i + 1} entfernen`} onClick={() => onChange(contacts.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <Button small icon={Plus} onClick={() => onChange([...contacts, emptyContact()])}>
        Ansprechpartner hinzufügen
      </Button>
    </fieldset>
  )
}

/** The ways a supplier delivers (FB-30): kind, order deadline, tour, arrival, postage */
export function DeliveriesEditor({
  deliveries,
  onChange,
  errorAt,
}: {
  deliveries: DeliveryForm[]
  onChange: (deliveries: DeliveryForm[]) => void
  errorAt: (index: number, field: keyof DeliveryForm) => string | undefined
}) {
  const kindsId = useId()
  const set = <K extends keyof DeliveryForm>(index: number, field: K, value: DeliveryForm[K]) =>
    onChange(deliveries.map((d, i) => (i === index ? { ...d, [field]: value } : d)))
  return (
    <fieldset className={styles.list}>
      <legend>Lieferarten und Touren</legend>
      <datalist id={kindsId}>
        {DELIVERY_KINDS.map((kind) => (
          <option key={kind} value={kind} />
        ))}
      </datalist>
      {deliveries.length === 0 && <p className="muted">Noch keine – z. B. Tagesexpress mit Bestellschluss und Ankunft, eine Zeile pro Tour.</p>}
      {deliveries.map((d, i) => (
        <div key={d.rowId} className={styles.entry} role="group" aria-label={`Lieferart ${i + 1}`}>
          <div className={styles.row3}>
            {/* checked before sending, not by the browser – an empty row added by mistake must not block saving */}
            <TextField label="Art" list={kindsId} maxLength={40} placeholder="z. B. Tagesexpress" value={d.kind} onChange={(e) => set(i, 'kind', e.target.value)} error={errorAt(i, 'kind')} />
            <TextField label="Bestellschluss" type="time" value={d.orderDeadline} onChange={(e) => set(i, 'orderDeadline', e.target.value)} />
            <TextField label="Tour" maxLength={60} placeholder="z. B. Tour 1" value={d.tour} onChange={(e) => set(i, 'tour', e.target.value)} error={errorAt(i, 'tour')} />
          </div>
          <div className={styles.row3}>
            <div className={styles.arrival}>
              <TextField label="Ankunft ca." type="time" value={d.arrival} onChange={(e) => set(i, 'arrival', e.target.value)} />
              <Checkbox label="nächster Tag" checked={d.arrivalNextDay} onChange={(e) => set(i, 'arrivalNextDay', e.target.checked)} />
            </div>
            <TextField label="Porto (CHF)" inputMode="decimal" maxLength={10} value={d.postage} onChange={(e) => set(i, 'postage', e.target.value)} error={errorAt(i, 'postage')} />
            <TextField
              label="Bemerkung"
              maxLength={200}
              placeholder="z. B. ab CHF 100 gratis"
              value={d.remark}
              onChange={(e) => set(i, 'remark', e.target.value)}
              error={errorAt(i, 'remark')}
            />
          </div>
          <div className={styles.entryFoot}>
            <span />
            <Button small variant="ghost" icon={Trash2} aria-label={`Lieferart ${i + 1} entfernen`} onClick={() => onChange(deliveries.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <Button small icon={Plus} onClick={() => onChange([...deliveries, emptyDelivery()])}>
        Lieferart hinzufügen
      </Button>
    </fieldset>
  )
}
