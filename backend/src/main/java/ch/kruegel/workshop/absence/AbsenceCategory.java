package ch.kruegel.workshop.absence;

/**
 * Why someone is not in the workshop – or, for {@link #PRESENT}, that someone with flexible hours
 * is. A fixed value, not a text (bug #1: "Ferien" vs. 'ferien').
 */
public enum AbsenceCategory {
    /** Ferien – counts against the vacation entitlement */
    VACATION,
    /** Krank */
    SICK,
    /** Fremdarbeit – working at another company (named) */
    EXTERNAL_WORK,
    /** Kurs / Weiterbildung */
    TRAINING,
    /**
     * Anwesend (12b) – the opposite: someone who works flexible hours says when they are in. Kept
     * here because it is entered, shown and kept free of overlaps exactly like an absence; the
     * statistics do not count it.
     */
    PRESENT;

    /** Away from the workshop? Everything except {@link #PRESENT}. */
    public boolean isAway() {
        return this != PRESENT;
    }
}
