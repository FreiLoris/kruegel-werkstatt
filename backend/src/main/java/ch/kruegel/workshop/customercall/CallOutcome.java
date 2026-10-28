package ch.kruegel.workshop.customercall;

/** How a call to the customer went (FB-16, FB-21) */
public enum CallOutcome {
    /** erreicht */
    REACHED,
    /** nicht erreicht */
    NOT_REACHED,
    /** Rückruf erbeten – the customer calls back, or wants to be called again */
    CALLBACK
}
