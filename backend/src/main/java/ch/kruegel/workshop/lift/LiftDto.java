package ch.kruegel.workshop.lift;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** A lift as delivered by the API. */
public record LiftDto(
        UUID id,
        long version,
        String name,
        boolean active,
        int sortOrder,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last (empty: initial data)") UUID updatedBy) {

    static LiftDto of(Lift lift) {
        return new LiftDto(lift.getId(), lift.getVersion(), lift.getName(), lift.isActive(), lift.getSortOrder(),
                lift.getUpdatedAt(), lift.getUpdatedBy());
    }
}
