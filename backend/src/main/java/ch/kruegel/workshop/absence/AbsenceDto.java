package ch.kruegel.workshop.absence;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/** An absence as delivered by the API. The person only as ID – the frontend has the employee list. */
public record AbsenceDto(
        UUID id,
        long version,
        @Schema(format = "uuid") UUID employeeId,
        AbsenceCategory category,
        @Schema(types = {"string", "null"}, description = "Only for external work") String company,
        @Schema(types = {"string", "null"}) String note,
        @Schema(format = "date") LocalDate startDate,
        @Schema(description = "Vacation: only the afternoon of the first day") boolean startsAfternoon,
        @Schema(types = {"string", "null"}, format = "time", description = "From this time on the first day (not vacation)") LocalTime startTime,
        @Schema(format = "date") LocalDate endDate,
        @Schema(description = "Vacation: only the morning of the last day") boolean endsNoon,
        @Schema(types = {"string", "null"}, format = "time", description = "Until this time on the last day (not vacation)") LocalTime endTime,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID updatedBy) {

    static AbsenceDto of(Absence absence) {
        AbsencePeriod p = absence.getPeriod();
        // getId() on a LAZY reference does not load it
        return new AbsenceDto(absence.getId(), absence.getVersion(), absence.getEmployee().getId(), absence.getCategory(),
                absence.getCompany(), absence.getNote(), p.startDate(), p.startsAfternoon(), p.startTime(), p.endDate(), p.endsNoon(), p.endTime(),
                absence.getUpdatedAt(), absence.getUpdatedBy());
    }
}
