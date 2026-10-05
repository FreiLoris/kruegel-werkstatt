package ch.kruegel.workshop.booking;

import ch.kruegel.workshop.task.TaskRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Wizard: a new task and its courtesy car in one go – both are saved or neither (7c).
 *
 * @param task        as for {@code POST /api/tasks}
 * @param courtesyCar the car for the task's customer
 */
public record TaskWithBookingRequest(@NotNull @Valid TaskRequest task, @NotNull @Valid CourtesyCarChoice courtesyCar) {

    /** Which car, from when to when. */
    public record CourtesyCarChoice(
            @NotNull UUID courtesyCarId,
            @NotNull @Schema(example = "2026-10-14T17:00") LocalDateTime pickupAt,
            @NotNull @Schema(example = "2026-10-15T17:00") LocalDateTime returnAt,
            @Size(max = CourtesyCarBooking.NOTES_MAX) String notes) {
    }
}
