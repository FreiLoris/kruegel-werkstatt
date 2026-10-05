package ch.kruegel.workshop.booking;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

/** Is a courtesy car free in the asked period – and if not, which bookings are in the way. */
public record AvailabilityDto(
        UUID courtesyCarId,
        String name,
        @Schema(types = {"string", "null"}) String model,
        @Schema(types = {"string", "null"}) String licensePlate,
        boolean available,
        @Schema(description = "Bookings that overlap the period; empty when available") List<BookingDto> conflicts,
        @Schema(types = {"object", "null"}, description = "The car is not back although it should be – it may still be "
                + "late for the asked period. A warning, not a conflict: the period is free as planned.") BookingDto overdue) {
}
