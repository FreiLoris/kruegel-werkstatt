package ch.kruegel.workshop.reminder;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** A wording to see as an SMS (17e) – not saved. */
public record SmsPreviewRequest(@NotNull @Size(max = SmsTemplate.MAX) String smsTemplate) {
}
