package ch.kruegel.workshop.publicholiday;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** The workshop's public holidays – all of them, the ones left out are none any more. */
public record PublicHolidaySettingsRequest(
        @NotNull @Size(max = 50) @Schema(example = "[\"NEUJAHR\", \"AUFFAHRT\"]") List<@NotNull HolidayRule> holidays,
        @NotNull Long version) {
}
