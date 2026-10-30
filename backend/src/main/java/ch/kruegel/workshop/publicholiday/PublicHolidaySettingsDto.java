package ch.kruegel.workshop.publicholiday;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** Every public holiday the app knows, the workshop's ones chosen (neutral 2). */
public record PublicHolidaySettingsDto(
        long version,
        @Schema(description = "In the order of the year") List<PublicHolidayChoiceDto> holidays) {
}
