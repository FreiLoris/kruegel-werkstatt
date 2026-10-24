package ch.kruegel.workshop.statistics;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * The active vehicles. Make, colour and fuel are free text (SwissGarage) – spelling variants such
 * as "VW" and "vw" are counted together, shown as written most often.
 *
 * @param oldest    by first registration (or model year), null without any
 * @param mostKm    the highest mileage, null without any
 */
public record VehicleStatisticsDto(
        long total,
        List<CountDto> makes,
        @Schema(description = "Label = make and model, e.g. \"VW Golf\"") List<CountDto> models,
        List<CountDto> colors,
        List<CountDto> fuels,
        @Schema(description = "Label = the canton letters of the plate, e.g. \"ZH\"") List<CountDto> cantons,
        @Schema(types = {"number", "null"}, format = "double", description = "Average age in years by first registration, null if none known") Double averageAgeYears,
        @Schema(types = {"object", "null"}) VehicleFactDto oldest,
        @Schema(types = {"object", "null"}) VehicleFactDto mostKm,
        @Schema(description = "All known mileages added up") long totalKm,
        @Schema(description = "How many vehicles have a mileage") long withMileage) {

    /** One vehicle that stands out – without its plate or holder */
    public record VehicleFactDto(
            @Schema(types = {"string", "null"}) String make,
            @Schema(types = {"string", "null"}) String model,
            @Schema(types = {"integer", "null"}, format = "int32") Integer year,
            @Schema(types = {"integer", "null"}, format = "int32") Integer mileageKm) {
    }
}
