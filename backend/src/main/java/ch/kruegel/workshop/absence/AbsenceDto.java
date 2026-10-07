package ch.kruegel.workshop.absence;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
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
        @Schema(description = "Only the afternoon of the first day") boolean startsAfternoon,
        @Schema(format = "date") LocalDate endDate,
        @Schema(description = "Only the morning of the last day") boolean endsNoon,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID updatedBy) {

    static AbsenceDto of(Absence absence) {
        AbsencePeriod p = absence.getPeriod();
        // getId() on a LAZY reference does not load it
        return new AbsenceDto(absence.getId(), absence.getVersion(), absence.getEmployee().getId(), absence.getCategory(),
                absence.getCompany(), absence.getNote(), p.startDate(), p.startsAfternoon(), p.endDate(), p.endsNoon(),
                absence.getUpdatedAt(), absence.getUpdatedBy());
    }
}
