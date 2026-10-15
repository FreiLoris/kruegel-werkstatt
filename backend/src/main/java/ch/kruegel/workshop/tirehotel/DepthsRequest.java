package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

/** Tread depths as entered, in mm to a tenth; empty = not measured. */
public record DepthsRequest(
        @DecimalMin("0") @DecimalMax("20") @Digits(integer = 2, fraction = 1) @Schema(example = "6.5") BigDecimal frontLeft,
        @DecimalMin("0") @DecimalMax("20") @Digits(integer = 2, fraction = 1) BigDecimal frontRight,
        @DecimalMin("0") @DecimalMax("20") @Digits(integer = 2, fraction = 1) BigDecimal rearLeft,
        @DecimalMin("0") @DecimalMax("20") @Digits(integer = 2, fraction = 1) BigDecimal rearRight) {

    TreadDepths toDepths() {
        return new TreadDepths(frontLeft, frontRight, rearLeft, rearRight);
    }

    /** Missing as a whole = nothing measured */
    static TreadDepths toDepths(DepthsRequest request) {
        return request == null ? TreadDepths.NONE : request.toDepths();
    }
}
