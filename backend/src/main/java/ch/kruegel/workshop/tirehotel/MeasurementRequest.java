package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** The set measured again – e.g. the depths noted by hand on the task sheet. */
public record MeasurementRequest(
        @NotNull @Valid DepthsRequest depths,
        @Schema(description = "Empty = today") LocalDate on,
        @Size(max = TireSetEvent.NOTE_MAX) String note) {
}
