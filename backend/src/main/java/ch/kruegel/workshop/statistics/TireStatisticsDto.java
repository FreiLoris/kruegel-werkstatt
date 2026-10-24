package ch.kruegel.workshop.statistics;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** The tyre hotel: all sets ever stored, the rankings over the sets in the hotel. */
public record TireStatisticsDto(
        long sets,
        @Schema(description = "Label = IN_HOTEL, MOUNTED or WITH_CUSTOMER") List<CountDto> states,
        @Schema(description = "Sets in the hotel; label = SUMMER, WINTER or ALL_SEASON") List<CountDto> seasons,
        @Schema(description = "Sets in the hotel; label = WHEELS or TIRES") List<CountDto> kinds,
        List<CountDto> brands,
        List<CountDto> dimensions,
        @Schema(types = {"number", "null"}, format = "double", description = "Average tread of the sets in the hotel in mm, null if none measured") Double averageDepthMm,
        @Schema(types = {"integer", "null"}, format = "int32", description = "Production year of the oldest set in the hotel") Integer oldestYear,
        @Schema(description = "Stored, retrieved, measured … this year; label = the event kind") List<CountDto> eventsThisYear) {
}
