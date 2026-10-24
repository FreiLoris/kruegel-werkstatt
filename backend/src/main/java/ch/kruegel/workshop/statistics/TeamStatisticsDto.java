package ch.kruegel.workshop.statistics;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

/**
 * The team, to-dos and pinboard. Absences only as a team total – nobody's sick days on a fun page.
 *
 * @param nextBirthday null if no active person has a birthday entered
 */
public record TeamStatisticsDto(
        long employees,
        @Schema(types = {"object", "null"}) BirthdayDto nextBirthday,
        @Schema(description = "Working days this year, half days as 0.5") double vacationDays,
        double sickDays,
        double trainingDays,
        double externalWorkDays,
        long todosOpen,
        long todosDone,
        @Schema(types = {"object", "null"}, description = "Who ticked off the most to-dos") CountDto todoChampion,
        long notes) {

    /** @param age the age reached on that day */
    public record BirthdayDto(String name, LocalDate date, int age) {
    }
}
