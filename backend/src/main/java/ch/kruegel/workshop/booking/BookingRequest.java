package ch.kruegel.workshop.booking;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Input for booking a courtesy car (create) or moving a booking (edit: car, period, notes;
 * task/holder stay). For a booking without task the holder is required.
 *
 * @param version only when editing
 */
public record BookingRequest(
        @NotNull UUID courtesyCarId,
        @Schema(description = "The task whose customer gets the car – or empty and a holder") UUID taskId,
        @Size(max = CourtesyCarBooking.HOLDER_MAX) @Schema(description = "Only without task, e.g. \"Frau Muster\"") String holder,
        @NotNull @Schema(example = "2026-10-14T17:00") LocalDateTime pickupAt,
        @NotNull @Schema(example = "2026-10-15T17:00") LocalDateTime returnAt,
        @Size(max = CourtesyCarBooking.NOTES_MAX) String notes,
        @Schema(description = "Only needed when editing") Long version) {
}
