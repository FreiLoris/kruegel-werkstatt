package ch.kruegel.workshop.stock;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/** A supplier of an article with its number for it; the name comes from the supplier list. */
public record StockItemSupplierDto(UUID supplierId, @Schema(types = {"string", "null"}) String articleNumber) {

    static StockItemSupplierDto of(StockItemSupplier link) {
        return new StockItemSupplierDto(link.supplier().getId(), link.articleNumber());
    }
}
