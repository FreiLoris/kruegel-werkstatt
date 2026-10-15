package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** The set leaves the hotel – mounted again or taken along by the customer. */
public record RetrieveRequest(
        @Schema(description = "Empty = today") LocalDate on,
        @Size(max = TireSetEvent.NOTE_MAX) String note) {
}
