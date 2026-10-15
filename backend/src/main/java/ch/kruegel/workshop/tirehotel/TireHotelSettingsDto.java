package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/** The tread limits of the tyre hotel. */
public record TireHotelSettingsDto(
        long version,
        @Schema(description = "Summer tyres below this: talk to the customer", example = "3.0") BigDecimal summerMm,
        @Schema(description = "Winter and all-season tyres below this: talk to the customer", example = "4.0") BigDecimal winterMm,
        @Schema(description = "Legal minimum", example = "1.6") BigDecimal minimumMm) {

    static TireHotelSettingsDto of(TireHotelSettings s) {
        return new TireHotelSettingsDto(s.getVersion(), s.getSummerMm(), s.getWinterMm(), s.getMinimumMm());
    }
}
