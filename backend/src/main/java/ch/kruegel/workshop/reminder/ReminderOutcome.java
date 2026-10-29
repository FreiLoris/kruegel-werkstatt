package ch.kruegel.workshop.reminder;

/** How a reminder went (17a). */
public enum ReminderOutcome {
    /** The SMS was taken by the provider */
    SENT,
    /** This installation cannot send on that channel (no access set up) – only written to the log */
    LOGGED,
    /** Sending failed – someone has to call */
    FAILED,
    /** No mobile number – someone has to call */
    NO_CONTACT
}
