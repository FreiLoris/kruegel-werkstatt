package ch.kruegel.workshop.absence;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

/**
 * The absences of a year counted (9c) – all numbers in WORKING days (Monday–Friday without public
 * holidays), half days as 0.5. Fixes bug #1: the old statistics were always 0.
 *
 * @param people    the active people and anyone who was away that year, in the usual order
 * @param companies external work per company, most days first
 */
public record AbsenceStatisticsDto(int year, List<PersonStatisticsDto> people, List<CompanyStatisticsDto> companies) {

    /**
     * @param vacationEntitlement vacation days per year from the employee
     * @param vacationTaken       up to and including today (the whole year once it is over)
     * @param vacationPlanned     entered for after today
     * @param vacationLeft        entitlement − taken − planned; negative = more than the entitlement
     */
    public record PersonStatisticsDto(
            @Schema(format = "uuid") UUID employeeId,
            String name,
            boolean active,
            int vacationEntitlement,
            double vacationTaken,
            double vacationPlanned,
            double vacationLeft,
            double sickDays,
            double trainingDays,
            double externalWorkDays) {
    }

    /**
     * @param company     as first entered (spelling variants are counted together)
     * @param assignments how many entries
     * @param employeeIds who worked there, in the usual order
     */
    public record CompanyStatisticsDto(String company, double days, int assignments, List<UUID> employeeIds) {
    }
}
