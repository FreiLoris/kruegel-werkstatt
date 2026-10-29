package ch.kruegel.workshop.reminder;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

/** Turn the reminders on or off, from when they are sent (08:00–19:00), and their wording. */
public record ReminderSettingsRequest(
        @NotNull Boolean enabled,
        @NotNull @Schema(type = "string", example = "16:00") LocalTime sendTime,
        @Size(max = SmsTemplate.MAX) @Schema(description = "17e: the wording with placeholders; empty = the standard text, missing = unchanged") String smsTemplate,
        @NotNull Long version) {
}
