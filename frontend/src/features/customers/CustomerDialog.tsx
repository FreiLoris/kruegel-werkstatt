import { PowerOff } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError, reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import styles from '../../components/ui/FormDialog.module.css'
import { Select, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useSingleFlight } from '../../lib/useSingleFlight'
import { useCreateCustomer, useSetCustomerActive, useUpdateCustomer, type CustomerRequest } from './customerApi'
import { phoneError, prefillFromSearch } from './customerForm'
import { MIN_SEARCH_LENGTH, useCustomerSearch, type Customer } from './customerSearchApi'

type Field = Exclude<keyof CustomerRequest, 'version'>
type FormValues = Record<Field, string>

const EMPTY: FormValues = {
  salutation: '',
  firstName: '',
  lastName: '',
  company: '',
  addition: '',
  street: '',
  postalCode: '',
  city: '',
  phone: '',
  mobile: '',
  email: '',
}

function valuesOf(customer: Customer): FormValues {
  return {
    salutation: customer.salutation ?? '',
    firstName: customer.firstName ?? '',
    lastName: customer.lastName ?? '',
    company: customer.company ?? '',
    addition: customer.addition ?? '',
    street: customer.street ?? '',
    postalCode: customer.postalCode ?? '',
    city: customer.city ?? '',
    phone: customer.phone ?? '',
    mobile: customer.mobile ?? '',
    email: customer.email ?? '',
  }
}

/** Empty fields are left out – the backend treats them as "not set". */
function toRequest(values: FormValues): CustomerRequest {
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => [field, value.trim() || undefined]),
  ) as CustomerRequest
}

/**
 * Create a walk-in customer, or edit one (only LOCAL customers – SwissGarage customers are changed
 * in SwissGarage, ADR 0003). Labels above every field; placeholders only as "z. B. …".
 *
 * @param customer    to edit; without: a new walk-in customer
 * @param initialName for a new one: what was typed in the search – usually the name
 */
export function CustomerDialog({
  customer,
  initialName = '',
  onSaved,
  onClose,
}: {
  customer?: Customer
  initialName?: string
  onSaved: (customer: Customer) => void
  onClose: () => void
}) {
  const formId = useId()
  const toast = useToast()
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const save = customer ? update : create
  const once = useSingleFlight()
  const setActive = useSetCustomerActive()
  const confirm = useConfirm()
  // the version as it was when the dialog opened – a live update must not hide a change from another device
  const [openedVersion] = useState(customer?.version)
  const [values, setValues] = useState<FormValues>(() => (customer ? valuesOf(customer) : { ...EMPTY, ...prefillFromSearch(initialName) }))

  const fieldError = (field: Field) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)

  // a new customer: is the person already there? (UX G-06 – "Bronnimann" found nothing, a second
  // "Brönnimann Lea" was created). The search forgives umlauts; only a hint, creating stays possible.
  const probe = useDebouncedValue(customer ? '' : (values.lastName.trim() || values.company.trim()), 400)
  const similar = useCustomerSearch(probe.length >= MIN_SEARCH_LENGTH ? probe : '', 5)
  const existing = (similar.data?.hits ?? []).flatMap((hit) => (hit.customer ? [hit.customer] : []))

  function set(field: Field, value: string) {
    setValues({ ...values, [field]: value })
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (phoneError(values.mobile) || phoneError(values.phone)) return
    const callbacks = {
      onSuccess: (saved: Customer) => {
        toast.success(`${saved.displayName} ${customer ? 'gespeichert' : 'erfasst'}`)
        onSaved(saved)
      },
      onError: (error: Error) => {
        if (error instanceof ApiError && error.isVersionConflict) {
          toast.error('Der Kunde wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.')
          onClose()
        } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
          toast.error(`Speichern fehlgeschlagen: ${error.message}`)
        }
      },
    }
    // a double click must not create the customer twice (UX G-03)
    once((done) => {
      if (customer) {
        update.mutate({ id: customer.id, request: { ...toRequest(values), version: openedVersion } }, { ...callbacks, onSettled: done })
      } else {
        create.mutate(toRequest(values), { ...callbacks, onSettled: done })
      }
    })
  }

  /** E12: a walk-in customer no longer needed disappears from the search – back under Einstellungen */
  async function stopUsing() {
    if (!customer) return
    const ok = await confirm({
      title: `${customer.displayName} nicht mehr verwenden?`,
      text: `${customer.displayName} erscheint nicht mehr in der Kundensuche. Bisherige Aufträge behalten den Kunden. Unter Einstellungen › Kunden und Fahrzeuge lässt sich das rückgängig machen.`,
      confirmLabel: 'Nicht mehr verwenden',
    })
    if (!ok) return
    setActive.mutate(
      { id: customer.id, active: false },
      {
        onSuccess: () => {
          toast.success(`${customer.displayName} wird nicht mehr verwendet`)
          onClose()
        },
        onError: (error) => toast.error(`${customer.displayName}: ${reasonOf(error)}`),
      },
    )
  }

  const text = (field: Field, label: string, props: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <TextField
      label={label}
      autoComplete="off"
      maxLength={100}
      value={values[field]}
      onChange={(e) => set(field, e.target.value)}
      error={fieldError(field)}
      {...props}
    />
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? `${customer.displayName} bearbeiten` : 'Neuer Kunde'}
      wide
      footer={
        <>
          {customer?.source === 'LOCAL' && customer.active && (
            <Button variant="ghost" icon={PowerOff} onClick={() => void stopUsing()} loading={setActive.isPending} className={styles.left}>
              Nicht mehr verwenden
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            {customer ? 'Speichern' : 'Kunde erfassen'}
          </Button>
        </>
      }
    >
      {/* our own field messages instead of the browser's bubbles (e-mail is checked by the server) */}
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        {existing.length > 0 && (
          <div className={styles.note} role="status">
            <strong>Gibt es den Kunden schon?</strong>
            <ul className={styles.similar}>
              {existing.map((c) => (
                <li key={c.id}>
                  {c.displayName}
                  <span className="muted"> {[c.city, c.mobile ?? c.phone].filter(Boolean).join(' · ')}</span>{' '}
                  <Button small onClick={() => onSaved(c)}>
                    Diesen nehmen
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!customer && (
          <p className={styles.note}>
            Für Laufkundschaft. Stammkunden kommen aus SwissGarage – ist der Kunde dort schon erfasst, erscheint er nach
            dem nächsten Import in der Suche.
          </p>
        )}
        <div className={styles.row}>
          <Select label="Anrede" value={values.salutation} onChange={(e) => set('salutation', e.target.value)}>
            <option value="">–</option>
            <option>Herr</option>
            <option>Frau</option>
          </Select>
          {text('firstName', 'Vorname')}
          <TextField
            label="Nachname"
            data-autofocus
            hint="Nachname oder Firma ist nötig"
            autoComplete="off"
            maxLength={100}
            value={values.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            error={fieldError('lastName')}
          />
        </div>
        <div className={styles.row}>
          {text('company', 'Firma')}
          {text('addition', 'Zusatz', { placeholder: 'z. B. z. Hd. Frau Keller' })}
        </div>
        <div className={styles.row}>
          {text('street', 'Strasse')}
          {text('postalCode', 'PLZ', { maxLength: 10, inputMode: 'numeric' })}
          {text('city', 'Ort')}
        </div>
        <div className={styles.row}>
          {text('mobile', 'Handy', { type: 'tel', placeholder: 'z. B. 079 123 45 67', error: phoneError(values.mobile) ?? fieldError('mobile') })}
          {text('phone', 'Telefon', { type: 'tel', error: phoneError(values.phone) ?? fieldError('phone') })}
          {text('email', 'E-Mail', { type: 'email' })}
        </div>
      </form>
    </Modal>
  )
}
