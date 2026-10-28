import { Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Checkbox, Select, TextArea, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useSingleFlight } from '../../lib/useSingleFlight'
import styles from './SupplierDialog.module.css'
import {
  addressForm,
  contactForm,
  deliveryForm,
  deliveryProblems,
  filledContacts,
  filledDeliveries,
  toAddress,
  toContacts,
  toDeliveries,
  type AddressForm,
  type ContactForm,
  type DeliveryForm,
  type DeliveryProblems,
} from './supplierForm'
import { hasPlace } from './returnLabel'
import { AddressFields, ContactsEditor, DeliveriesEditor } from './SupplierLists'
import { ORDER_CHANNEL_LABEL, useDeleteSupplier, useSaveSupplier, type OrderChannel, type Supplier, type SupplierRequest } from './supplierApi'

const FIELDS = ['name', 'phone', 'email', 'webshopUrl', 'customerNumber', 'orderChannel', 'delivery', 'remark'] as const
type FormValues = Record<(typeof FIELDS)[number], string>

function initialValues(supplier?: Supplier): FormValues {
  return Object.fromEntries(FIELDS.map((field) => [field, supplier?.[field] ?? ''])) as FormValues
}

interface Addresses {
  address: AddressForm
  /** null = returns go to the address */
  returnAddress: AddressForm | null
}

function toRequest(values: FormValues, contacts: ContactForm[], deliveries: DeliveryForm[], addresses: Addresses, version?: number): SupplierRequest {
  const text = (field: keyof FormValues) => values[field].trim() || undefined
  return {
    name: values.name.trim(),
    phone: text('phone'),
    email: text('email'),
    webshopUrl: text('webshopUrl'),
    customerNumber: text('customerNumber'),
    orderChannel: (values.orderChannel || null) as OrderChannel | null,
    delivery: text('delivery'),
    remark: text('remark'),
    contacts: toContacts(contacts),
    deliveries: toDeliveries(deliveries),
    address: toAddress(addresses.address),
    returnAddress: addresses.returnAddress && toAddress(addresses.returnAddress),
    version,
  }
}

/** Add, edit or delete a supplier (FB-09). Mounted fresh on every open (`key`). */
export function SupplierDialog({ supplier, articleCount, onClose }: { supplier?: Supplier; articleCount: number; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveSupplier()
  const once = useSingleFlight()
  const remove = useDeleteSupplier()
  const [values, setValues] = useState(() => initialValues(supplier))
  const [contacts, setContacts] = useState<ContactForm[]>(() => supplier?.contacts.map(contactForm) ?? [])
  const [deliveries, setDeliveries] = useState<DeliveryForm[]>(() => supplier?.deliveries.map(deliveryForm) ?? [])
  const [addresses, setAddresses] = useState<Addresses>(() => ({
    address: addressForm(supplier?.address),
    returnAddress: supplier?.returnAddress ? addressForm(supplier.returnAddress) : null,
  }))
  // FB-31: a return address with only a name has nowhere to go
  const [returnProblem, setReturnProblem] = useState<string | undefined>()
  // checked before sending (FB-30): a way of delivery without kind, a postage that is no amount
  const [problems, setProblems] = useState<Map<number, DeliveryProblems>>(new Map())

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)
  const contactError = (i: number, field: keyof ContactForm) =>
    // "Abteilung, Name, Telefon oder E-Mail angeben" is for the whole row – shown at its first field
    fieldError(`contacts[${i}].${field}`) ?? (field === 'department' ? fieldError(`contacts[${i}]`) : undefined)
  const deliveryError = (i: number, field: keyof DeliveryForm) =>
    (field === 'kind' || field === 'postage' ? problems.get(i)?.[field] : undefined) ?? fieldError(`deliveries[${i}].${field}`)

  /** A field error the form does not show at a field – said as a message, so saving never seems to do nothing */
  function unshownError(error: ApiError): string | undefined {
    const shown = (field: string) => (FIELDS as readonly string[]).includes(field) || /^(contacts|deliveries)\[\d+\]/.test(field)
    return error.problem.errors?.find((e) => !shown(e.field))?.message
  }

  function set(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    // empty rows go first – so the row numbers of the server's errors are the rows shown
    const sentContacts = filledContacts(contacts)
    const sentDeliveries = filledDeliveries(deliveries)
    setContacts(sentContacts)
    setDeliveries(sentDeliveries)
    const found = deliveryProblems(sentDeliveries)
    setProblems(found)
    const returnWithoutPlace = addresses.returnAddress !== null && !hasPlace(toAddress(addresses.returnAddress))
    setReturnProblem(returnWithoutPlace ? 'Strasse, PLZ oder Ort angeben – oder das Häkchen entfernen' : undefined)
    if (found.size > 0 || returnWithoutPlace) return
    once((done) =>
      save.mutate(
        { id: supplier?.id, request: toRequest(values, sentContacts, sentDeliveries, addresses, supplier?.version) },
        {
          onSettled: done,
          onSuccess: (saved) => {
            toast.success(`${saved.name} gespeichert`)
            onClose()
          },
          onError: (error) => {
            // Only an existing supplier can have been changed elsewhere; a 409 while creating (same name
            // created on another device at the same time) keeps the input and shows the server's reason
            if (supplier && error instanceof ApiError && error.isVersionConflict) {
              toast.error(`${supplier.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
              onClose()
            } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
              toast.error(`Speichern fehlgeschlagen: ${error.message}`)
            } else if (unshownError(error)) {
              toast.error(`Speichern fehlgeschlagen: ${unshownError(error)}`)
            }
          },
        },
      ),
    )
  }

  async function deleteSupplier() {
    if (!supplier) return
    const ok = await confirm({
      title: `${supplier.name} löschen?`,
      text:
        articleCount > 0
          ? `${articleCount === 1 ? 'Ein Artikel' : `${articleCount} Artikel`} im Lager verlieren diesen Lieferanten. Das lässt sich nicht rückgängig machen.`
          : 'Das lässt sich nicht rückgängig machen.',
      confirmLabel: 'Löschen',
    })
    if (!ok) return
    remove.mutate(supplier.id, {
      onSuccess: () => {
        toast.success(`${supplier.name} gelöscht`)
        onClose()
      },
      onError: (error) => toast.error(`${supplier.name}: ${error.message}`),
    })
  }

  const field = (name: keyof FormValues, label: string, props: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <TextField label={label} autoComplete="off" value={values[name]} onChange={(e) => set(name, e.target.value)} error={fieldError(name)} {...props} />
  )

  return (
    <Modal
      open
      onClose={onClose}
      // contacts and ways of delivery side by side need the room (FB-30)
      wide
      title={supplier ? `${supplier.name} bearbeiten` : 'Neuer Lieferant'}
      footer={
        <>
          {supplier && (
            <Button variant="ghost" icon={Trash2} onClick={deleteSupplier} loading={remove.isPending} className={styles.left}>
              Löschen
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
        {field('name', 'Firma', { required: true, maxLength: 100, placeholder: 'z. B. Muster Teile AG' })}
        {field('customerNumber', 'Unsere Kundennummer', { maxLength: 60, hint: 'Unsere Nummer beim Lieferanten' })}
        <fieldset className={styles.list}>
          <legend>Adresse</legend>
          <AddressFields address={addresses.address} onChange={(address) => setAddresses({ ...addresses, address })} />
          <Checkbox
            label="Rücksendungen an eine andere Adresse (z. B. Zentrallager)"
            checked={addresses.returnAddress !== null}
            onChange={(e) => setAddresses({ ...addresses, returnAddress: e.target.checked ? addressForm(null) : null })}
          />
          {addresses.returnAddress && (
            <AddressFields
              address={addresses.returnAddress}
              withName
              error={returnProblem}
              onChange={(returnAddress) => {
                setAddresses({ ...addresses, returnAddress })
                setReturnProblem(undefined)
              }}
            />
          )}
        </fieldset>
        <div className={styles.row}>
          {field('phone', 'Telefon Zentrale', { type: 'tel', maxLength: 40 })}
          {field('email', 'E-Mail Zentrale', { type: 'email', maxLength: 100 })}
        </div>
        <ContactsEditor
          contacts={contacts}
          onChange={(next) => {
            setContacts(next)
            if (save.error) save.reset()
          }}
          errorAt={contactError}
        />
        {field('webshopUrl', 'Webshop', { maxLength: 300, placeholder: 'z. B. shop.example.ch' })}
        <div className={styles.row}>
          <Select label="Bestellweg" value={values.orderChannel} onChange={(e) => set('orderChannel', e.target.value)} error={fieldError('orderChannel')}>
            <option value="">–</option>
            {Object.entries(ORDER_CHANNEL_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {field('delivery', 'Lieferzeit – Bemerkung', { maxLength: 100, placeholder: 'z. B. 5× täglich' })}
        </div>
        <DeliveriesEditor
          deliveries={deliveries}
          onChange={(next) => {
            setDeliveries(next)
            setProblems(new Map())
            if (save.error) save.reset()
          }}
          errorAt={deliveryError}
        />
        <TextArea label="Bemerkung" rows={2} maxLength={1000} value={values.remark} onChange={(e) => set('remark', e.target.value)} error={fieldError('remark')} />
      </form>
    </Modal>
  )
}
