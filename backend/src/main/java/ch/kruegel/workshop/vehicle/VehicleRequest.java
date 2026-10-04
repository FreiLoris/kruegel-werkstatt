package ch.kruegel.workshop.vehicle;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Input for creating and editing a LOCAL vehicle. Empty texts count as "not set".
 * Make or model is required – checked by {@link VehicleService} with a field error.
 *
 * @param customerId holder; empty = holder unknown
 * @param version    only when editing: the version the device loaded (optimistic locking)
 */
public record VehicleRequest(
        UUID customerId,
        @Size(max = VehicleDetails.LICENSE_PLATE_MAX) String licensePlate,
        @Size(max = VehicleDetails.MAX) String make,
        @Size(max = VehicleDetails.MAX) String model,
        @Size(max = VehicleDetails.MAX) String vin,
        @PastOrPresent LocalDate firstRegistration,
        @Min(1900) @Max(2100) Integer modelYear,
        @PositiveOrZero Integer mileageKm,
        @PastOrPresent LocalDate lastMfk,
        @Size(max = VehicleDetails.MAX) String color,
        @Size(max = VehicleDetails.MAX) String fuel,
        @Schema(description = "Only needed when editing") Long version) {

    boolean hasMakeOrModel() {
        return !(isBlank(make) && isBlank(model));
    }

    VehicleDetails toDetails() {
        return new VehicleDetails(licensePlate, make, model, vin, firstRegistration, modelYear, mileageKm,
                lastMfk, color, fuel);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
