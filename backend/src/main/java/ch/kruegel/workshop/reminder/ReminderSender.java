package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.ReminderChannel;
import ch.kruegel.workshop.customer.ReminderContact;

/**
 * Sends reminders on one channel (17a) – the SMS provider. A bean only when its
 * access is set up for this installation: without one, reminders are only logged.
 */
public interface ReminderSender {

    ReminderChannel channel();

    /**
     * @throws RuntimeException when it did not go out – the message says why (kept with the reminder)
     */
    void send(ReminderContact to, ReminderMessage message);
}
