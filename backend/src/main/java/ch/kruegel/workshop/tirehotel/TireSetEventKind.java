package ch.kruegel.workshop.tirehotel;

/** What happened to a set – every step keeps the tread depths of that moment. */
public enum TireSetEventKind {
    STORED,
    MEASURED,
    /** onto another place – also the first place of a set stored without one */
    MOVED,
    RETRIEVED,
    /** recorded without the hotel (FB-12): brought by the customer, or taken home – with its depths */
    RECORDED,
    /** put on the car from the customer (FB-12) – brought along again */
    MOUNTED,
    /** taken off, the customer takes it home (FB-12) */
    TAKEN_HOME,
    /** taken off and disposed of – new tyres went on (FB-25) */
    DISPOSED
}
