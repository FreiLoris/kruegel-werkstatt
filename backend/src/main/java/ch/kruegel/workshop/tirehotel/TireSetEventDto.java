package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One step in the history of a set. */
public record TireSetEventDto(
        UUID id,
        TireSetEventKind kind,
        LocalDate happenedOn,
        @Schema(description = "The depths of that moment") TreadDepths depths,
        @Schema(types = {"string", "null"}) String note,
        @Schema(types = {"string", "null"}, example = "OG-B3-1", description = "The place of that moment") String place,
        Instant createdAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who did it") UUID createdBy) {

    static TireSetEventDto of(TireSetEvent e) {
        return new TireSetEventDto(e.getId(), e.getKind(), e.getHappenedOn(), e.getDepths(), e.getNote(), e.getPlace(), e.getCreatedAt(), e.getCreatedBy());
    }
}
