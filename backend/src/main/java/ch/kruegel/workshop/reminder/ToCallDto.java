package ch.kruegel.workshop.reminder;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/** A customer who got no reminder for the day and is to be called (17d). */
public record ToCallDto(
        UUID taskId,
        @Schema(types = {"string", "null"}) String taskNumber,
        UUID customerId,
        String customerName,
        @Schema(types = {"string", "null"}, description = "Mobile, else phone – empty: none known") String phone,
        ReminderOutcome outcome,
        @Schema(types = {"string", "null"}, description = "Why the SMS failed") String error) {
}
