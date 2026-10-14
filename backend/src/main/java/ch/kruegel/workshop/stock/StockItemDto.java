package ch.kruegel.workshop.stock;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** An article in stock as delivered by the API. */
public record StockItemDto(
        UUID id,
        long version,
        String name,
        StockCategory category,
        @Schema(types = {"string", "null"}) String articleNumber,
        @Schema(types = {"string", "null"}) String manufacturer,
        @Schema(types = {"integer", "null"}, description = "Empty = not counted") Integer quantity,
        @Schema(types = {"string", "null"}, format = "uuid") UUID storageLocationId,
        @Schema(types = {"string", "null"}) String remark,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last") UUID updatedBy) {

    static StockItemDto of(StockItem item) {
        StorageLocation location = item.getStorageLocation();
        return new StockItemDto(item.getId(), item.getVersion(), item.getName(), item.getCategory(), item.getArticleNumber(),
                item.getManufacturer(), item.getQuantity(), location == null ? null : location.getId(), item.getRemark(),
                item.getUpdatedAt(), item.getUpdatedBy());
    }
}
