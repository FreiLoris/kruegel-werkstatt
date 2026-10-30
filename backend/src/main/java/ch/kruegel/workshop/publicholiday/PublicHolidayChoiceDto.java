package ch.kruegel.workshop.publicholiday;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

/** One public holiday the workshop may have (neutral 2). */
public record PublicHolidayChoiceDto(
        HolidayRule rule,
        @Schema(example = "Auffahrt") String name,
        @Schema(description = "This year – to recognise it") LocalDate date,
        @Schema(description = "A public holiday of this workshop") boolean chosen) {
}
