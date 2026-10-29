package ch.kruegel.workshop.reminder;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalTime;

/** The reminder settings (17a) – and what this installation can send. */
public record ReminderSettingsDto(
        long version,
        @Schema(description = "Customers are reminded the working day before") boolean enabled,
        @Schema(type = "string", example = "16:00", description = "From when on the day before") LocalTime sendTime,
        @Schema(description = "This installation can send SMS – the access to the SMS provider is set up") boolean smsReady,
        @Schema(description = "This installation can send e-mails – the mail account is set up") boolean emailReady) {
}
