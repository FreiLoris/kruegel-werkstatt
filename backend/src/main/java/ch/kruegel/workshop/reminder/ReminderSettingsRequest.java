package ch.kruegel.workshop.reminder;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

/** Turn the reminders on or off, and from when they are sent (08:00–19:00). */
public record ReminderSettingsRequest(
        @NotNull Boolean enabled,
        @NotNull @Schema(type = "string", example = "16:00") LocalTime sendTime,
        @NotNull Long version) {
}
