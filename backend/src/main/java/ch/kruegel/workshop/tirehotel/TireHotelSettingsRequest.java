package ch.kruegel.workshop.tirehotel;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** New tread limits; the minimum must not be above the others (checked by the service). */
public record TireHotelSettingsRequest(
        @NotNull @DecimalMin("0.1") @DecimalMax("20") @Digits(integer = 2, fraction = 1) BigDecimal summerMm,
        @NotNull @DecimalMin("0.1") @DecimalMax("20") @Digits(integer = 2, fraction = 1) BigDecimal winterMm,
        @NotNull @DecimalMin("0.1") @DecimalMax("20") @Digits(integer = 2, fraction = 1) BigDecimal minimumMm,
        @NotNull Long version) {
}
