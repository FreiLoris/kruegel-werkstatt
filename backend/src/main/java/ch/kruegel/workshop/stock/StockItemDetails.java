package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.Texts;

import java.util.HashSet;
import java.util.List;
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
 * @param suppliers       who sells it, the main supplier first; each one once
 */
public record StockItemDetails(String name, StockCategory category, String articleNumber, String manufacturer,
                               Integer quantity, StorageLocation storageLocation, String remark,
                               List<StockItemSupplier> suppliers) {

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
        suppliers = suppliers == null ? List.of() : List.copyOf(suppliers);
        if (!suppliers.stream().map(s -> s.supplier().getId()).allMatch(new HashSet<>()::add)) {
            throw new IllegalArgumentException("A supplier may appear only once per article");
        }
    }
}
