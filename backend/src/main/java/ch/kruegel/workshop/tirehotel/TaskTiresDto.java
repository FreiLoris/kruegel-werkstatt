package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * The tyre hotel seen from a task (13q): what its tyre change booked, and the sets of its vehicle
 * to choose from – for the task sheet and for booking.
 *
 * @param inHotel   the sets of the vehicle in the hotel (with sets of the customer without a vehicle) – to mount
 * @param retrieved those retrieved earlier, the last first – usually the set on the car now, to store again
 */
public record TaskTiresDto(
        @Schema(types = {"object", "null"}, description = "The set the task mounted – empty = not booked yet") TireSetDto mounted,
        @Schema(types = {"object", "null"}, description = "The set the task stored – empty = not booked yet") TireSetDto removed,
        List<TireSetDto> inHotel,
        List<TireSetDto> retrieved) {
}
