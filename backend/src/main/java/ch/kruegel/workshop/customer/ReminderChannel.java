package ch.kruegel.workshop.customer;

/** How a customer is reminded of an appointment (17a). */
public enum ReminderChannel {
    /** To a mobile number – preferred */
    SMS,
    /** When there is no mobile number */
    EMAIL
}
