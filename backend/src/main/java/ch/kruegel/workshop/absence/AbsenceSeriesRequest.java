package ch.kruegel.workshop.absence;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;
import java.util.UUID;

/**
 * Input for a series (FB-33): the same absence on chosen weekdays from … to – e.g. external work every
 * Mon, Tue and Thu for three months. Category, company, note and times apply to every day.
 *
 * @param everyOtherWeek only every second week, counted from the week of {@code from}
 */
public record AbsenceSeriesRequest(
        @NotNull UUID employeeId,
        @NotNull AbsenceCategory category,
        @Size(max = Absence.COMPANY_MAX) @Schema(description = "Only for external work – required there") String company,
        @Size(max = Absence.NOTE_MAX) String note,
        @NotNull LocalDate from,
        @NotNull LocalDate to,
        @NotEmpty Set<DayOfWeek> weekdays,
        @Schema(description = "Only every second week; missing = every week") Boolean everyOtherWeek,
        @Schema(description = "Vacation only: only the afternoon of each day; missing = false") Boolean startsAfternoon,
        @Schema(types = {"string", "null"}, format = "time", description = "Not for vacation: from this time on each day; empty = whole day")
        LocalTime startTime,
        @Schema(description = "Vacation only: only the morning of each day; missing = false") Boolean endsNoon,
        @Schema(types = {"string", "null"}, format = "time", description = "Not for vacation: until this time on each day; empty = whole day")
        LocalTime endTime) {

    public AbsenceSeriesRequest {
        everyOtherWeek = Boolean.TRUE.equals(everyOtherWeek);
        startsAfternoon = Boolean.TRUE.equals(startsAfternoon);
        endsNoon = Boolean.TRUE.equals(endsNoon);
    }
}
