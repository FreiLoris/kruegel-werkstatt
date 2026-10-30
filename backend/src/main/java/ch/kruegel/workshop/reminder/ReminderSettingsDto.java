package ch.kruegel.workshop.reminder;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalTime;
import java.util.List;

/** The reminder settings (17a) – and what this installation can send. */
public record ReminderSettingsDto(
        long version,
        @Schema(description = "Customers are reminded the working day before") boolean enabled,
        @Schema(type = "string", example = "16:00", description = "From when on the day before") LocalTime sendTime,
        @Schema(description = "This installation can send SMS – the access to the SMS provider is set up") boolean smsReady,
        @Schema(description = "17e: the wording sent – the workshop's own or the standard") String smsTemplate,
        @Schema(description = "17e: the workshop changed the wording") boolean ownTemplate,
        @Schema(description = "17e: the app's standard wording") String standardTemplate,
        @Schema(description = "17e: the placeholders, without braces", example = "[\"Anrede\", \"Termin\"]") List<String> placeholders,
        @Schema(description = "Neutral 1: shown on the phone as the sender", example = "Kruegel") String smsSender,
        @Schema(description = "Neutral 1: the workshop set its own sender") boolean ownSender,
        @Schema(description = "Neutral 1: the sender taken from the company name – without an own one", example = "Kruegel") String companySender) {
}
