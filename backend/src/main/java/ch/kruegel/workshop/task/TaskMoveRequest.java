package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Drag & drop: put the task into a lift column at a position – on the same day (day view)
 * or on another day (week view).
 *
 * @param liftId   target column; empty = "Ohne Lift"
 * @param position 0 = top; larger than the column = at the end
 * @param date     new day; empty = stays on its day
 */
public record TaskMoveRequest(
        @Schema(types = {"string", "null"}, format = "uuid") UUID liftId,
        @NotNull @Min(0) Integer position,
        @Schema(types = {"string", "null"}, format = "date") LocalDate date) {
}
