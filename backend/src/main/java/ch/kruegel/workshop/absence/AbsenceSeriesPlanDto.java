package ch.kruegel.workshop.absence;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.util.List;

/**
 * What a series makes (FB-33) – shown before saving: "Erstellt 39 Einträge vom 02.11.2026 bis 29.01.2027".
 *
 * @param days      the days that get an entry, oldest first
 * @param holidays  chosen weekdays left out because they are public holidays
 * @param conflicts days left out because the person has something else entered then
 */
public record AbsenceSeriesPlanDto(
        @Schema(format = "date") List<LocalDate> days,
        @Schema(format = "date") List<LocalDate> holidays,
        List<SeriesConflictDto> conflicts) {
}
