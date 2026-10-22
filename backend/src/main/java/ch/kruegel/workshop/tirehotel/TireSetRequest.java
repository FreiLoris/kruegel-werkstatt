package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Input for storing a set and for editing its data. Depths and day only count when storing – later
 * the depths change by a measurement ({@link MeasurementRequest}), so they land in the history.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record TireSetRequest(
        @NotNull UUID customerId,
        @Schema(description = "May be open") UUID vehicleId,
        @NotNull Season season,
        @NotNull TireSetKind kind,
        @Schema(description = "Only with complete wheels; may be unknown") RimKind rims,
        @Schema(description = "Missing = false") Boolean hubCaps,
        @Schema(description = "Radschrauben beachten (FB-17); missing = false") Boolean wheelBolts,
        @Size(max = TireSetDetails.NAME_MAX) String brand,
        @Size(max = TireSetDetails.NAME_MAX) String model,
        @Size(max = TireSetDetails.DIMENSION_MAX) @Schema(example = "205/55 R16 91H") String dimension,
        @Min(TireSetDetails.YEAR_MIN) @Max(TireSetDetails.YEAR_MAX) @Schema(description = "Year of manufacture (DOT)", example = "2022") Integer year,
        @Size(max = TireSetDetails.REMARK_MAX) String remark,
        @Min(TireSetDetails.TORQUE_MIN) @Max(TireSetDetails.TORQUE_MAX) @Schema(description = "Torque of the wheel bolts in Nm", example = "120") Integer torque,
        @DecimalMin(TireSetDetails.PRESSURE_MIN) @DecimalMax(TireSetDetails.PRESSURE_MAX) @Digits(integer = 1, fraction = 2) @Schema(description = "Tyre pressure front in bar", example = "2.5") BigDecimal pressureFront,
        @DecimalMin(TireSetDetails.PRESSURE_MIN) @DecimalMax(TireSetDetails.PRESSURE_MAX) @Digits(integer = 1, fraction = 2) @Schema(description = "Tyre pressure rear in bar", example = "2.7") BigDecimal pressureRear,
        @Valid @Schema(description = "Only when storing: the depths measured then") DepthsRequest depths,
        @Schema(description = "Only when storing: the day; empty = today") LocalDate storedOn,
        @Schema(description = "Only when storing: the place; empty = assigned later (then by moving)") UUID placeId,
        @Schema(description = "Only needed when editing") Long version) {

    public TireSetRequest {
        hubCaps = Boolean.TRUE.equals(hubCaps);
        wheelBolts = Boolean.TRUE.equals(wheelBolts);
    }
}
