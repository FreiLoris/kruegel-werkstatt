package ch.kruegel.workshop.task;

/**
 * Where a task stands in the workshop. "Waiting customer" is NOT a status but a flag on the
 * appointment ({@link Appointment#waitingCustomer()}) – in the old app it was both (bug #4).
 */
public enum TaskStatus {
    /** Eingang – booked or vehicle arrived, work not started */
    RECEIVED,
    /** In Arbeit */
    IN_PROGRESS,
    /** Wartet auf Material */
    WAITING_FOR_PARTS,
    /** Fertig */
    DONE
}
