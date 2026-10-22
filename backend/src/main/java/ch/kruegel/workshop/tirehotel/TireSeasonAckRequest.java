package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/** "Quittieren" of a set for the season shown (FB-21) */
public record TireSeasonAckRequest(
        @NotNull UUID tireSetId,
        @NotNull @Schema(description = "The deadline of the season shown – it is acknowledged for that one") LocalDate deadline,
        @Size(max = 200) @Schema(types = {"string", "null"}, example = "Fährt Reifen herunter") String reason) {
}
