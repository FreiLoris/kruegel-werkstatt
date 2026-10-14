package ch.kruegel.workshop.stock;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** A storage location as delivered by the API. */
public record StorageLocationDto(
        UUID id,
        long version,
        String name,
        boolean active,
        int sortOrder,
        @Schema(types = {"string", "null"}, format = "uuid", description = "The place it is in; empty = top level") UUID parentId,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last") UUID updatedBy) {

    static StorageLocationDto of(StorageLocation location) {
        return new StorageLocationDto(location.getId(), location.getVersion(), location.getName(), location.isActive(),
                location.getSortOrder(), location.getParentId(), location.getUpdatedAt(), location.getUpdatedBy());
    }
}
