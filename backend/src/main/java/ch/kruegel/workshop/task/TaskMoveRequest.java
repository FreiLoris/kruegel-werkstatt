package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Drag & drop in the day view: put the task into a lift column at a position.
 *
 * @param liftId   target column; empty = "Ohne Lift"
 * @param position 0 = top; larger than the column = at the end
 */
public record TaskMoveRequest(
        @Schema(types = {"string", "null"}, format = "uuid") UUID liftId,
        @NotNull @Min(0) Integer position) {
}
