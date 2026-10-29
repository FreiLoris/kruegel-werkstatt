package ch.kruegel.workshop.reminder;

/** How a reminder went (17a). */
public enum ReminderOutcome {
    /** The SMS or e-mail went out */
    SENT,
    /** This installation cannot send on that channel (no access set up) – only written to the log */
    LOGGED,
    /** Sending failed – someone has to call */
    FAILED,
    /** No mobile number and no e-mail – someone has to call */
    NO_CONTACT
}
