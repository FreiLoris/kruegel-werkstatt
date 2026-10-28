package ch.kruegel.workshop.task;

/** Which wheels/tires are mounted – stored in the workshop or brought by the customer. */
public enum TireChangeKind {
    /** Räder eingelagert */
    WHEELS_STORED,
    /** Reifen eingelagert */
    TIRES_STORED,
    /** Räder mitgebracht */
    WHEELS_BROUGHT,
    /** Reifen mitgebracht */
    TIRES_BROUGHT,
    /** Neue Reifen (bestellt) – ordered for the customer, mounted on the old rims (FB-25) */
    NEW_TIRES
}
