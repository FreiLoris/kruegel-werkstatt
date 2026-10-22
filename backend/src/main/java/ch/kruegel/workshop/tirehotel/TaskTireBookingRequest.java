package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * The tyre change of a task (13q, FB-12): the set put on and the one taken off, each with the depths
 * noted on the task sheet – from the hotel or not. Each may be missing, and each is booked once per
 * task. Customer and vehicle are those of the task, the day is today.
 */
public record TaskTireBookingRequest(
        @Valid @Schema(description = "The set now on the car – missing = not recorded") MountedSet mounted,
        @Valid @Schema(description = "The set taken off – missing = not recorded") RemovedSet removed) {

    /**
     * A set of the vehicle ({@code setId}: from the hotel, or brought along again by the customer) – or a
     * new one the customer brought ({@code newSet}).
     *
     * @param depths as noted on the task sheet; empty = not measured again
     */
    public record MountedSet(
            @Schema(description = "A set of the vehicle in the hotel or with the customer – empty = a new one") UUID setId,
            @Valid @Schema(description = "Only for a new set the customer brought") NewSet newSet,
            @Valid DepthsRequest depths) {
    }

    /**
     * A set of the vehicle ({@code setId}: the one on the car, or one retrieved earlier) – or a new one
     * ({@code newSet}); stored in the hotel, or the customer takes it home ({@code store = false}, FB-12).
     *
     * @param store   into the hotel; false = the customer takes it home; missing = into the hotel
     * @param placeId only when stored; empty = assigned later
     */
    public record RemovedSet(
            @Schema(description = "A set of the vehicle not in the hotel – empty = a new one") UUID setId,
            @Valid @Schema(description = "Only for a new set") NewSet newSet,
            @Valid @Schema(description = "As noted on the task sheet") DepthsRequest depths,
            @Schema(description = "Into the hotel (default) or the customer takes it home (false)") Boolean store,
            @Schema(description = "Only into the hotel: the place; empty = assigned later") UUID placeId) {

        public RemovedSet {
            store = !Boolean.FALSE.equals(store);
        }
    }

    /** What a set is that was not known yet – the same as when storing one (season and kind needed). */
    public record NewSet(
            @Schema(description = "Needed") Season season,
            @Schema(description = "Needed") TireSetKind kind,
            @Schema(description = "Only with complete wheels") RimKind rims,
            @Schema(description = "Missing = false") Boolean hubCaps,
            @Schema(description = "Radschrauben beachten; missing = false") Boolean wheelBolts,
            @Size(max = TireSetDetails.NAME_MAX) String brand,
            @Size(max = TireSetDetails.NAME_MAX) String model,
            @Size(max = TireSetDetails.DIMENSION_MAX) String dimension,
            @Min(TireSetDetails.YEAR_MIN) @Max(TireSetDetails.YEAR_MAX) Integer year,
            @Size(max = TireSetDetails.REMARK_MAX) String remark,
            @Min(TireSetDetails.TORQUE_MIN) @Max(TireSetDetails.TORQUE_MAX) @Schema(description = "Torque in Nm") Integer torque,
            @DecimalMin(TireSetDetails.PRESSURE_MIN) @DecimalMax(TireSetDetails.PRESSURE_MAX) @Digits(integer = 1, fraction = 2)
            @Schema(description = "Pressure front in bar") BigDecimal pressureFront,
            @DecimalMin(TireSetDetails.PRESSURE_MIN) @DecimalMax(TireSetDetails.PRESSURE_MAX) @Digits(integer = 1, fraction = 2)
            @Schema(description = "Pressure rear in bar") BigDecimal pressureRear) {

        public NewSet {
            hubCaps = Boolean.TRUE.equals(hubCaps);
            wheelBolts = Boolean.TRUE.equals(wheelBolts);
        }
    }
}
