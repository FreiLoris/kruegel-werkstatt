package ch.kruegel.workshop.shopping;

/** Where a position of the shopping list stands (FB-20). */
public enum ShoppingStatus {
    /** Zu bestellen */
    TO_ORDER,
    /** Bestellt */
    ORDERED,
    /** Geliefert – on the list "Erledigt" */
    ARRIVED
}
