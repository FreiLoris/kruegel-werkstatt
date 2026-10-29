package ch.kruegel.workshop.reminder;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Looks every 10 minutes whether customers are to be reminded (17a) – not once at the set time: an
 * app restarted then (an update) would miss the day. The service knows what is due and what was sent.
 */
@Component
class ReminderJob {

    private final ReminderService service;

    ReminderJob(ReminderService service) {
        this.service = service;
    }

    @Scheduled(cron = "0 */10 * * * *", zone = "Europe/Zurich")
    void remind() {
        service.remindDue();
    }
}
