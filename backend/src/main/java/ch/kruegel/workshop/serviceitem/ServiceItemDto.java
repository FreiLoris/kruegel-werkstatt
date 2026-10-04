package ch.kruegel.workshop.serviceitem;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** A service item as delivered by the API. */
public record ServiceItemDto(
        UUID id,
        long version,
        String name,
        boolean active,
        int sortOrder,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last (empty: initial data)") UUID updatedBy) {

    static ServiceItemDto of(ServiceItem item) {
        return new ServiceItemDto(item.getId(), item.getVersion(), item.getName(), item.isActive(), item.getSortOrder(),
                item.getUpdatedAt(), item.getUpdatedBy());
    }
}
