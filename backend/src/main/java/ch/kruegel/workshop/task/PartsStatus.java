package ch.kruegel.workshop.task;

/** State of the parts order of a task. */
public enum PartsStatus {
    /** Zum bestellen */
    TO_ORDER,
    /** Bestellt */
    ORDERED,
    /** Material angekommen */
    ARRIVED
}
