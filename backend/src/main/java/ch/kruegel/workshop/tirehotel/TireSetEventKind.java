package ch.kruegel.workshop.tirehotel;

/** What happened to a set – every step keeps the tread depths of that moment. */
public enum TireSetEventKind {
    STORED,
    MEASURED,
    /** onto another place – also the first place of a set stored without one */
    MOVED,
    RETRIEVED
}
