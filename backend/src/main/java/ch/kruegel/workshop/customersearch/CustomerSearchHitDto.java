package ch.kruegel.workshop.customersearch;

import ch.kruegel.workshop.customer.CustomerDto;
import ch.kruegel.workshop.vehicle.VehicleDto;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** One hit: a customer with their active vehicles, or a vehicle without known holder. */
public record CustomerSearchHitDto(
        @Schema(types = {"object", "null"}, description = "Empty for a vehicle without known holder") CustomerDto customer,
        @Schema(description = "Active vehicles; the ones matching the search first") List<VehicleDto> vehicles) {
}
