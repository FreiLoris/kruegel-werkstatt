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
        @Schema(description = "Bookings that overlap the period; empty when available") List<BookingDto> conflicts) {
}
