package ch.kruegel.workshop.common;

/**
 * Where a customer or vehicle record comes from – see ADR 0003 (hybrid model).
 */
public enum RecordSource {
    /** From the SwissGarage import: updated only by the import, read-only in the app. */
    SWISSGARAGE,
    /** Created in the app (e.g. walk-in customer): editable. */
    LOCAL
}
