package ch.kruegel.workshop.booking;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

/** A courtesy car booking as delivered by the API. Date-times are Swiss local time. */
public record BookingDto(
        UUID id,
        long version,
        UUID courtesyCarId,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Empty = booking without task") UUID taskId,
        @Schema(description = "Who has the car: the task's customer or the free-text holder") String holderName,
        @Schema(types = {"string", "null"}, description = "Only for bookings without task") String holder,
        @Schema(example = "2026-10-14T17:00:00") LocalDateTime pickupAt,
        @Schema(example = "2026-10-15T17:00:00") LocalDateTime returnAt,
        @Schema(types = {"string", "null"}, description = "When the car actually came back") LocalDateTime returnedAt,
        @Schema(description = "Until when the car is really taken (early return frees it)") LocalDateTime blockedUntil,
        @Schema(types = {"string", "null"}) String notes,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID updatedBy) {

    static BookingDto of(CourtesyCarBooking b) {
        String holderName = b.getTask() != null ? b.getTask().getCustomer().getDetails().displayName() : b.getHolder();
        return new BookingDto(b.getId(), b.getVersion(), b.getCourtesyCar().getId(),
                b.getTask() == null ? null : b.getTask().getId(), holderName, b.getHolder(),
                b.getPeriod().pickupAt(), b.getPeriod().returnAt(), b.getReturnedAt(), b.blockedUntil(), b.getNotes(),
                b.getUpdatedAt(), b.getUpdatedBy());
    }
}
