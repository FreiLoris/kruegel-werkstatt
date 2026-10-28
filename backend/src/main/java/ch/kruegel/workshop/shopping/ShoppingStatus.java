package ch.kruegel.workshop.shopping;

/**
 * Where a position of the shopping list stands (FB-20), in its usual order (FB-28) – and who is up:
 * we (to order, give the supplier information, decide on the quote) or the supplier.
 */
public enum ShoppingStatus {
    /** Zu bestellen – nothing done yet */
    TO_ORDER,
    /** Offerte angefragt – the supplier is up */
    QUOTE_REQUESTED,
    /** Rückfrage – the supplier needs information from us */
    INFO_NEEDED,
    /** Offerte erhalten – we decide */
    QUOTE_RECEIVED,
    /** Bestellt */
    ORDERED,
    /** Geliefert – on the list "Erledigt" */
    ARRIVED,
    /** Storniert – not ordered any more, on the list "Erledigt" */
    CANCELLED;

    /** We have something to do – the to-do of "Bestellen durch" is open */
    public boolean isOurTurn() {
        return this == TO_ORDER || this == INFO_NEEDED || this == QUOTE_RECEIVED;
    }

    /** Not ordered yet – no day of order */
    public boolean isBeforeOrder() {
        return this == TO_ORDER || this == QUOTE_REQUESTED || this == INFO_NEEDED || this == QUOTE_RECEIVED;
    }

    /** Nothing more to happen: arrived or cancelled */
    public boolean isClosed() {
        return this == ARRIVED || this == CANCELLED;
    }
}
