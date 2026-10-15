package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/** The set onto another place – or its first one, if it had none yet. */
public record MoveRequest(
        @NotNull UUID placeId,
        @Schema(description = "Empty = today") LocalDate on,
        @Size(max = TireSetEvent.NOTE_MAX) String note) {
}
