package ch.kruegel.workshop.shopping;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** A line in the history of a position: a note or a change of state, with who and when. */
public record ShoppingEntryDto(
        UUID id,
        ShoppingEntry.Kind kind,
        @Schema(types = {"string", "null"}, description = "Only a note") String text,
        @Schema(types = {"string", "null"}, description = "Only a change of state: the new one") ShoppingStatus status,
        Instant at,
        @Schema(types = {"string", "null"}, format = "uuid") UUID by) {

    static ShoppingEntryDto of(ShoppingEntry entry) {
        return new ShoppingEntryDto(entry.getId(), entry.getKind(), entry.getText(), entry.getStatus(), entry.getCreatedAt(),
                entry.getCreatedBy());
    }
}
