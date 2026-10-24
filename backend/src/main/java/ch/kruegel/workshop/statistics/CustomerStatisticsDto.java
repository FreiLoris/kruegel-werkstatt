package ch.kruegel.workshop.statistics;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** The active customers. */
public record CustomerStatisticsDto(
        long total,
        @Schema(description = "Customers with a company name") long companies,
        @Schema(description = "Entered this year") long newThisYear,
        long withEmail,
        long withMobile,
        List<CountDto> cities,
        List<CountDto> firstNames,
        @Schema(description = "Label = SWISSGARAGE or LOCAL") List<CountDto> sources) {
}
