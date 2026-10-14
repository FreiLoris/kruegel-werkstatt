package ch.kruegel.workshop.stock;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Input for creating and editing an article in stock.
 *
 * @param storageLocationId a newly chosen storage location must be in use; empty = no fixed place
 * @param suppliers         who sells it, the main supplier first; missing = none
 * @param version           only when editing
 */
public record StockItemRequest(
        @NotBlank @Size(max = StockItem.NAME_MAX) String name,
        @NotNull StockCategory category,
        @Size(max = StockItem.CODE_MAX) String articleNumber,
        @Size(max = StockItem.CODE_MAX) String manufacturer,
        @PositiveOrZero @Schema(types = {"integer", "null"}, description = "Empty = not counted") Integer quantity,
        @Schema(types = {"string", "null"}, format = "uuid") UUID storageLocationId,
        @Size(max = StockItem.REMARK_MAX) String remark,
        @Valid @Size(max = 10) @Schema(description = "Main supplier first") List<SupplierRef> suppliers,
        @Schema(description = "Only needed when editing") Long version) {

    /** A supplier of the article with its own number for it */
    public record SupplierRef(@NotNull UUID supplierId, @Size(max = StockItem.CODE_MAX) String articleNumber) {
    }
}
