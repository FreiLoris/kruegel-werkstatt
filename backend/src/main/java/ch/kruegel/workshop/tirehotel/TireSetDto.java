package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.customer.CustomerDto;
import ch.kruegel.workshop.vehicle.VehicleDto;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A set as delivered by the API, with customer and vehicle (list, labels, receipt). */
public record TireSetDto(
        UUID id,
        long version,
        CustomerDto customer,
        @Schema(types = {"object", "null"}, description = "Still open if empty") VehicleDto vehicle,
        Season season,
        TireSetKind kind,
        @Schema(types = {"string", "null"}) RimKind rims,
        boolean hubCaps,
        @Schema(description = "Radschrauben beachten (FB-17)") boolean wheelBolts,
        @Schema(types = {"string", "null"}) String brand,
        @Schema(types = {"string", "null"}) String model,
        @Schema(types = {"string", "null"}) String dimension,
        @Schema(types = {"integer", "null"}, description = "Year of manufacture (DOT)") Integer year,
        @Schema(types = {"string", "null"}) String remark,
        @Schema(types = {"integer", "null"}, description = "Torque of the wheel bolts in Nm") Integer torque,
        @Schema(types = {"number", "null"}, description = "Tyre pressure front in bar") BigDecimal pressureFront,
        @Schema(types = {"number", "null"}, description = "Tyre pressure rear in bar") BigDecimal pressureRear,
        @Schema(description = "As last measured") TreadDepths depths,
        LocalDate storedOn,
        @Schema(types = {"string", "null"}, format = "date", description = "Empty = in the hotel") LocalDate retrievedOn,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Where it lies; empty = not assigned (or retrieved)") UUID placeId,
        @Schema(types = {"string", "null"}, example = "OG-B3-1") String place,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last") UUID updatedBy) {

    static TireSetDto of(TireSet s) {
        TireSetDetails d = s.getDetails();
        return new TireSetDto(s.getId(), s.getVersion(), CustomerDto.of(d.customer()), d.vehicle() == null ? null : VehicleDto.of(d.vehicle()),
                d.season(), d.kind(), d.rims(), d.hubCaps(), d.wheelBolts(), d.brand(), d.model(), d.dimension(), d.year(), d.remark(),
                d.torque(), d.pressureFront(), d.pressureRear(),
                s.getDepths(), s.getStoredOn(), s.getRetrievedOn(), s.getPlace() == null ? null : s.getPlace().getId(),
                s.getPlace() == null ? null : s.getPlace().getAddress(), s.getUpdatedAt(), s.getUpdatedBy());
    }
}
