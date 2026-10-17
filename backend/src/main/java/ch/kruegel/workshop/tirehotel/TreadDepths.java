package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Tread depths of the four wheels in mm, to a tenth – as measured with the gauge. Each may be
 * unknown (empty), e.g. a set taken over from SwissGarage without measurements.
 *
 * @param frontLeft  VL
 * @param frontRight VR
 * @param rearLeft   HL
 * @param rearRight  HR
 */
@Embeddable
public record TreadDepths(
        @Column(name = "depth_fl") @Schema(types = {"number", "null"}, example = "6.5") BigDecimal frontLeft,
        @Column(name = "depth_fr") @Schema(types = {"number", "null"}) BigDecimal frontRight,
        @Column(name = "depth_rl") @Schema(types = {"number", "null"}) BigDecimal rearLeft,
        @Column(name = "depth_rr") @Schema(types = {"number", "null"}) BigDecimal rearRight) {

    static final BigDecimal MAX = BigDecimal.valueOf(20);

    /** Nothing measured */
    public static final TreadDepths NONE = new TreadDepths(null, null, null, null);

    public TreadDepths {
        frontLeft = checked(frontLeft, "VL");
        frontRight = checked(frontRight, "VR");
        rearLeft = checked(rearLeft, "HL");
        rearRight = checked(rearRight, "HR");
    }

    /** Hibernate gives an embeddable with all columns empty as {@code null}. */
    static TreadDepths orNone(TreadDepths depths) {
        return depths == null ? NONE : depths;
    }

    /**
     * A new measurement over the last one: a wheel not measured now keeps its last depth (decision of the
     * workshop) – measuring only the front must not make the rear ones "unknown".
     */
    public TreadDepths over(TreadDepths last) {
        TreadDepths before = orNone(last);
        return new TreadDepths(frontLeft != null ? frontLeft : before.frontLeft, frontRight != null ? frontRight : before.frontRight,
                rearLeft != null ? rearLeft : before.rearLeft, rearRight != null ? rearRight : before.rearRight);
    }

    /** The lowest measured depth – what decides whether the customer needs new tyres; empty if none is measured. */
    public BigDecimal lowest() {
        return Stream.of(frontLeft, frontRight, rearLeft, rearRight).filter(Objects::nonNull).min(BigDecimal::compareTo).orElse(null);
    }

    private static BigDecimal checked(BigDecimal depth, String wheel) {
        if (depth == null) {
            return null;
        }
        if (depth.signum() < 0 || depth.compareTo(MAX) > 0) {
            throw new IllegalArgumentException("Tread depth " + wheel + " out of range: " + depth);
        }
        return depth.setScale(1, RoundingMode.HALF_UP);
    }
}
