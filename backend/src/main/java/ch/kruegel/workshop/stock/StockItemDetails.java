package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.Texts;

import java.util.Objects;

/**
 * What an article in stock says – everything that is edited together.
 *
 * @param name            the designation; trimmed, required
 * @param articleNumber   empty = none
 * @param manufacturer    empty = none
 * @param quantity        how many there are; empty = not counted
 * @param storageLocation where it lies; empty = no fixed place
 * @param remark          empty = none
 */
public record StockItemDetails(String name, StockCategory category, String articleNumber, String manufacturer,
                               Integer quantity, StorageLocation storageLocation, String remark) {

    public StockItemDetails {
        name = Texts.checkMaxLength(Texts.emptyToNull(name), StockItem.NAME_MAX, "Name");
        if (name == null) {
            throw new IllegalArgumentException("Name is required");
        }
        Objects.requireNonNull(category, "category");
        articleNumber = Texts.checkMaxLength(Texts.emptyToNull(articleNumber), StockItem.CODE_MAX, "Article number");
        manufacturer = Texts.checkMaxLength(Texts.emptyToNull(manufacturer), StockItem.CODE_MAX, "Manufacturer");
        if (quantity != null && quantity < 0) {
            throw new IllegalArgumentException("Quantity must not be negative: " + quantity);
        }
        remark = Texts.checkMaxLength(Texts.emptyToNull(remark), StockItem.REMARK_MAX, "Remark");
    }
}
