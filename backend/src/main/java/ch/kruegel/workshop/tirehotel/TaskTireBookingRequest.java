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
import java.util.UUID;

/**
 * The tyre change of a task booked in the tyre hotel (13q): the set mounted leaves the hotel, the
 * one taken off goes in – each may be missing (brought by the customer, taken home), and each is
 * booked once per task. Customer and vehicle are those of the task, the day is today.
 */
public record TaskTireBookingRequest(
        @Valid @Schema(description = "The set from the hotel now on the car – missing = none mounted from the hotel") MountedSet mounted,
        @Valid @Schema(description = "The set taken off, into the hotel – missing = not stored") RemovedSet removed) {

    /** @param depths as noted on the task sheet; empty = not measured again */
    public record MountedSet(@NotNull UUID setId, @Valid DepthsRequest depths) {
    }

    /**
     * Either a set of the customer retrieved earlier, stored again ({@code setId}; its data stay) –
     * or a new one, then season and kind are needed.
     */
    public record RemovedSet(
            @Schema(description = "A retrieved set of the customer – empty = a new set") UUID setId,
            @Schema(description = "Only for a new set (needed then)") Season season,
            @Schema(description = "Only for a new set (needed then)") TireSetKind kind,
            @Schema(description = "Only for a new set with complete wheels") RimKind rims,
            @Schema(description = "Only for a new set; missing = false") Boolean hubCaps,
            @Schema(description = "Only for a new set; missing = false") Boolean wheelBolts,
            @Size(max = TireSetDetails.NAME_MAX) String brand,
            @Size(max = TireSetDetails.NAME_MAX) String model,
            @Size(max = TireSetDetails.DIMENSION_MAX) String dimension,
            @Min(TireSetDetails.YEAR_MIN) @Max(TireSetDetails.YEAR_MAX) Integer year,
            @Size(max = TireSetDetails.REMARK_MAX) String remark,
            @Min(TireSetDetails.TORQUE_MIN) @Max(TireSetDetails.TORQUE_MAX) @Schema(description = "Only for a new set: torque in Nm") Integer torque,
            @DecimalMin(TireSetDetails.PRESSURE_MIN) @DecimalMax(TireSetDetails.PRESSURE_MAX) @Digits(integer = 1, fraction = 2) @Schema(description = "Only for a new set: pressure front in bar") BigDecimal pressureFront,
            @DecimalMin(TireSetDetails.PRESSURE_MIN) @DecimalMax(TireSetDetails.PRESSURE_MAX) @Digits(integer = 1, fraction = 2) @Schema(description = "Only for a new set: pressure rear in bar") BigDecimal pressureRear,
            @Valid @Schema(description = "As noted on the task sheet") DepthsRequest depths,
            @Schema(description = "Empty = assigned later") UUID placeId) {

        public RemovedSet {
            hubCaps = Boolean.TRUE.equals(hubCaps);
            wheelBolts = Boolean.TRUE.equals(wheelBolts);
        }
    }
}
