package ch.kruegel.workshop.reminder;

/**
 * What the customer gets (17a).
 *
 * @param subject for an e-mail
 * @param text    the SMS, or the e-mail's body
 */
public record ReminderMessage(String subject, String text) {
}
