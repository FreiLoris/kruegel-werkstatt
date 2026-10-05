package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Drag & drop in the time grid: a task gets a new lift, start and end – moved as a whole, or only
 * its end dragged. In the week view: another day, the same time and duration.
 *
 * @param liftId empty = "Ohne Lift"
 */
public record TaskScheduleRequest(
        @Schema(types = {"string", "null"}, format = "uuid") UUID liftId,
        @NotNull LocalDate date,
        @NotNull @Schema(type = "string", example = "08:00") LocalTime time,
        @NotNull @Schema(example = "2026-10-15T09:30") LocalDateTime endAt) {
}
