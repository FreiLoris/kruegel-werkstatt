package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.ReminderChannel;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A task's customer was reminded – or could not be (17d). */
public record ReminderDto(
        UUID taskId,
        @Schema(description = "The day the car is to be brought – the reminder went out the working day before") LocalDate dropOffDate,
        @Schema(types = {"string", "null"}, description = "Empty when there was no mobile number") ReminderChannel channel,
        ReminderOutcome outcome,
        @Schema(types = {"string", "null"}, description = "Why it failed, in the workshop's words") String error,
        @Schema(description = "When") Instant at) {

    static ReminderDto of(TaskReminder r) {
        return new ReminderDto(r.getTaskId(), r.getDropOffDate(), r.getChannel(), r.getOutcome(), r.getError(), r.getCreatedAt());
    }
}
