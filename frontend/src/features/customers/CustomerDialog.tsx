import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import styles from '../../components/ui/FormDialog.module.css'
import { Select, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useCreateCustomer, useUpdateCustomer, type CustomerRequest } from './customerApi'
import type { Customer } from './customerSearchApi'

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
  // the version as it was when the dialog opened – a live update must not hide a change from another device
  const [openedVersion] = useState(customer?.version)
  const [values, setValues] = useState<FormValues>(() => (customer ? valuesOf(customer) : { ...EMPTY, lastName: initialName.trim() }))

  const fieldError = (field: Field) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)

  function set(field: Field, value: string) {
    setValues({ ...values, [field]: value })
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const callbacks = {
      onSuccess: (saved: Customer) => {
        toast.success(`${saved.displayName} ${customer ? 'gespeichert' : 'erfasst'}`)
        onSaved(saved)
      },
      onError: (error: Error) => {
        if (error instanceof ApiError && error.isConflict) {
          toast.error('Der Kunde wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.')
          onClose()
        } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
          toast.error(`Speichern fehlgeschlagen: ${error.message}`)
        }
      },
    }
    if (customer) {
      update.mutate({ id: customer.id, request: { ...toRequest(values), version: openedVersion } }, callbacks)
    } else {
      create.mutate(toRequest(values), callbacks)
    }
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
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            {customer ? 'Speichern' : 'Kunde erfassen'}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
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
          {text('mobile', 'Handy', { type: 'tel', placeholder: 'z. B. 079 123 45 67' })}
          {text('phone', 'Telefon', { type: 'tel' })}
          {text('email', 'E-Mail', { type: 'email' })}
        </div>
      </form>
    </Modal>
  )
}
