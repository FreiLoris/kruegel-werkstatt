package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** New deadlines "MM-DD"; a real day, not 29 February, and not the same for both (checked by the service). */
public record TireSeasonSettingsRequest(
        @NotNull @Pattern(regexp = "\\d{2}-\\d{2}") @Schema(example = "06-01") String summerDeadline,
        @NotNull @Pattern(regexp = "\\d{2}-\\d{2}") @Schema(example = "12-01") String winterDeadline,
        @NotNull Long version) {
}
