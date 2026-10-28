package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * The tyre hotel seen from a task (13q): what its tyre change booked, and the sets of its vehicle
 * to choose from – for the task sheet and for booking.
 *
 * @param inHotel  the sets of the vehicle in the hotel (with sets of the customer without a vehicle) – to mount
 * @param outside  the others (FB-12): the one on the car first – to take off – then those with the customer,
 *                 to be brought along; the latest step first
 */
public record TaskTiresDto(
        @Schema(types = {"object", "null"}, description = "The set the task put on the car – empty = not booked yet") TireSetDto mounted,
        @Schema(types = {"string", "null"}, description = "How: RETRIEVED from the hotel, MOUNTED brought by the customer (FB-12)")
        TireSetEventKind mountedAs,
        @Schema(types = {"object", "null"}, description = "The set the task took off (stored or home) – empty = not booked yet") TireSetDto removed,
        @Schema(types = {"string", "null"}, description = "How: STORED into the hotel, TAKEN_HOME by the customer (FB-12), DISPOSED (FB-25)")
        TireSetEventKind removedAs,
        List<TireSetDto> inHotel,
        List<TireSetDto> outside) {
}
