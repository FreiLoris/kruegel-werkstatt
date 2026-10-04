package ch.kruegel.workshop.vehicle;

import ch.kruegel.workshop.common.RecordSource;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A vehicle as delivered by the API. */
public record VehicleDto(
        UUID id,
        long version,
        RecordSource source,
        @Schema(types = {"string", "null"}, description = "SwissGarage internal number (only for source SWISSGARAGE)") String swissgarageNumber,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Holder; empty if unknown") UUID customerId,
        @Schema(description = "\"VW Golf\" – make and model") String description,
        @Schema(types = {"string", "null"}) String licensePlate,
        @Schema(types = {"string", "null"}) String make,
        @Schema(types = {"string", "null"}) String model,
        @Schema(types = {"string", "null"}) String vin,
        @Schema(types = {"string", "null"}, format = "date") LocalDate firstRegistration,
        @Schema(types = {"integer", "null"}) Integer modelYear,
        @Schema(types = {"integer", "null"}) Integer mileageKm,
        @Schema(types = {"string", "null"}, format = "date", description = "Date of the LAST official inspection") LocalDate lastMfk,
        @Schema(types = {"string", "null"}) String color,
        @Schema(types = {"string", "null"}) String fuel,
        @Schema(description = "False for SwissGarage vehicles – they are changed in SwissGarage") boolean editable,
        boolean active,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last (empty: import/sample data)") UUID updatedBy) {

    public static VehicleDto of(Vehicle v) {
        VehicleDetails d = v.getDetails();
        // getCustomer().getId() does not load the customer: Hibernate knows the ID of a LAZY reference
        UUID customerId = v.getCustomer() == null ? null : v.getCustomer().getId();
        return new VehicleDto(v.getId(), v.getVersion(), v.getSource(), v.getSwissgarageNumber(), customerId,
                d.description(), d.licensePlate(), d.make(), d.model(), d.vin(), d.firstRegistration(),
                d.modelYear(), d.mileageKm(), d.lastMfk(), d.color(), d.fuel(), !v.isFromSwissGarage(),
                v.isActive(), v.getUpdatedAt(), v.getUpdatedBy());
    }
}
