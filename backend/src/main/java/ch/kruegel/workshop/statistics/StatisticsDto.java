package ch.kruegel.workshop.statistics;

import java.time.LocalDate;

/** All numbers of the statistics page, counted on the day {@code today}. */
public record StatisticsDto(
        LocalDate today,
        TaskStatisticsDto tasks,
        VehicleStatisticsDto vehicles,
        CustomerStatisticsDto customers,
        TireStatisticsDto tires,
        TeamStatisticsDto team,
        MaterialStatisticsDto material) {
}
