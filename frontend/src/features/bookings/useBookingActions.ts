import { reasonOf } from '../../api/errors'
import { useConfirm } from '../../components/ui/confirmContext'
import { useToast } from '../../components/ui/toastContext'
import { formatLocalDateTime, nowTimeIso, todayIso } from '../../lib/format'
import { useCancelBooking, useReturn, type Booking } from './bookingApi'

/** Now in Swiss time as "2026-10-15T10:00" – compared with booking times */
function nowLocal(): string {
  return `${todayIso()}T${nowTimeIso()}`
}

/**
 * Return, undo and cancel – with confirmation and messages, the same on the task and the
 * courtesy car page.
 *
 * @param carName how the car is called in messages
 */
export function useBookingActions(carName: (courtesyCarId: string) => string) {
  const cancel = useCancelBooking()
  const giveBack = useReturn()
  const confirm = useConfirm()
  const toast = useToast()

  /** "Ist zurück" makes sense only once the car has been picked up */
  const canReturn = (booking: Booking) => !booking.returnedAt && booking.pickupAt.slice(0, 16) <= nowLocal()

  async function cancelBooking(booking: Booking, onDone?: () => void) {
    const ok = await confirm({
      title: 'Buchung stornieren?',
      text: `${carName(booking.courtesyCarId)} ist dann ab ${formatLocalDateTime(booking.pickupAt)} wieder frei.`,
      confirmLabel: 'Stornieren',
      dangerous: true,
    })
    if (!ok) return
    cancel.mutate(booking.id, {
      onSuccess: () => {
        toast.success('Buchung storniert')
        onDone?.()
      },
      onError: (e) => toast.error(`Stornieren fehlgeschlagen: ${reasonOf(e)}`),
    })
  }

  function setReturned(booking: Booking, undo: boolean) {
    giveBack.mutate(
      { id: booking.id, undo },
      {
        onSuccess: () => toast.success(undo ? 'Rückgabe rückgängig gemacht' : `${carName(booking.courtesyCarId)} ist zurück`),
        onError: (e) => toast.error(reasonOf(e)),
      },
    )
  }

  return { canReturn, cancelBooking, setReturned, pending: cancel.isPending || giveBack.isPending }
}
