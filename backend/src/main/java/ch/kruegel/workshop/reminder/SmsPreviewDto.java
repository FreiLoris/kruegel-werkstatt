package ch.kruegel.workshop.reminder;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** A wording as an example customer gets it, and what it costs (17e). */
public record SmsPreviewDto(
        @Schema(description = "For Herr Muster, SH 12345, tomorrow at 08:00") String text,
        @Schema(description = "Characters as the SMS counts them") int characters,
        @Schema(description = "SMS it takes – each one is paid") int parts,
        @Schema(description = "Characters outside the SMS alphabet – replaced on the way") List<String> replaced,
        @Schema(description = "Placeholders the app does not know – saving refuses them") List<String> unknown) {
}
