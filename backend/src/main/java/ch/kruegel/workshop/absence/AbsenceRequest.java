package ch.kruegel.workshop.absence;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Input for entering and changing an absence.
 *
 * @param company required for external work, empty otherwise
 * @param version only when editing
 */
public record AbsenceRequest(
        @NotNull UUID employeeId,
        @NotNull AbsenceCategory category,
        @Size(max = Absence.COMPANY_MAX) @Schema(description = "Only for external work – required there") String company,
        @Size(max = Absence.NOTE_MAX) String note,
        @NotNull LocalDate startDate,
        @Schema(description = "Only the afternoon of the first day; missing = false") Boolean startsAfternoon,
        @NotNull LocalDate endDate,
        @Schema(description = "Only the morning of the last day; missing = false") Boolean endsNoon,
        @Schema(description = "Only needed when editing") Long version) {

    public AbsenceRequest {
        startsAfternoon = Boolean.TRUE.equals(startsAfternoon);
        endsNoon = Boolean.TRUE.equals(endsNoon);
    }
}
