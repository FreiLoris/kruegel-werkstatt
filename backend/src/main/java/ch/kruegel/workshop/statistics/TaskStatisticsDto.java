package ch.kruegel.workshop.statistics;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.util.List;

/**
 * Everything about the tasks. Rankings have the most first; the charts by month, weekday and hour
 * only count tasks with an appointment date.
 *
 * @param perMonth   the last 12 months up to this one, also months without a task
 * @param perWeekday 7 numbers, Monday first
 * @param perHour    the hours of the appointment times that occur, earliest first
 * @param busiestDay the day with the most appointments (label = ISO date), null without tasks
 */
public record TaskStatisticsDto(
        long total,
        long thisYear,
        long thisMonth,
        long done,
        long waitingCustomer,
        long tireChange,
        long mfk,
        @Schema(types = {"string", "null"}, format = "date", description = "Date of the first appointment – since when there are numbers") LocalDate firstAppointment,
        List<CountDto> perMonth,
        List<Long> perWeekday,
        List<CountDto> perHour,
        @Schema(description = "Label = the status (RECEIVED, IN_PROGRESS, WAITING_FOR_PARTS, DONE)") List<CountDto> byStatus,
        List<CountDto> serviceItems,
        List<CountDto> lifts,
        List<CountDto> mechanics,
        @Schema(description = "Who took the task on (\"angenommen von\")") List<CountDto> acceptedBy,
        @Schema(description = "Customers with the most tasks") List<CountDto> regulars,
        @Schema(types = {"object", "null"}) CountDto busiestDay,
        @Schema(types = {"integer", "null"}, format = "int64", description = "Average planned length in minutes (start to \"fertig bis\"), null if none known") Long averageMinutes) {
}
