package ch.kruegel.workshop.absence;

/** Why someone is not in the workshop. A fixed value, not a text (bug #1: "Ferien" vs. 'ferien'). */
public enum AbsenceCategory {
    /** Ferien – counts against the vacation entitlement */
    VACATION,
    /** Krank */
    SICK,
    /** Fremdarbeit – working at another company (named) */
    EXTERNAL_WORK,
    /** Kurs / Weiterbildung */
    TRAINING
}
