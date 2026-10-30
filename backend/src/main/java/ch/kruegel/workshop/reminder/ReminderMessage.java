package ch.kruegel.workshop.reminder;

/**
 * What the customer gets (17a).
 *
 * @param sender what the phone shows as the sender (neutral 1)
 * @param text   the SMS
 */
public record ReminderMessage(String sender, String text) {
}
