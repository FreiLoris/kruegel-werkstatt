package ch.kruegel.workshop.task;

/** Where the vehicle of a task is (FB-16) – who has to be called in once it can be planned. */
public enum VehicleLocation {
    /** Bei uns – in the workshop */
    AT_WORKSHOP,
    /** Beim Kunden – call the customer in ("aufbieten") */
    AT_CUSTOMER
}
