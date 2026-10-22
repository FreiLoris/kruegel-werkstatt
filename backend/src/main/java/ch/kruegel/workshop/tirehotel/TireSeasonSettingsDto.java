package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

/** The deadlines of the season change (FB-21) as "MM-DD". */
public record TireSeasonSettingsDto(
        long version,
        @Schema(description = "Summer tyres on by then", example = "06-01") String summerDeadline,
        @Schema(description = "Winter tyres on by then", example = "12-01") String winterDeadline) {

    static TireSeasonSettingsDto of(TireSeasonSettings s) {
        return new TireSeasonSettingsDto(s.getVersion(), s.getSummerDeadline().format(TireSeasonSettings.FORMAT),
                s.getWinterDeadline().format(TireSeasonSettings.FORMAT));
    }
}
