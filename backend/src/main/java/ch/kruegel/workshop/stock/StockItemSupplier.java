package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.supplier.Supplier;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

import java.util.Objects;

/**
 * Who sells an article, with the supplier's own article number (FB-09). The first one of an article
 * is its main supplier.
 *
 * @param articleNumber the supplier's number for it; empty = none
 */
@Embeddable
public record StockItemSupplier(@ManyToOne(fetch = FetchType.LAZY) Supplier supplier, String articleNumber) {

    public StockItemSupplier {
        Objects.requireNonNull(supplier, "supplier");
        articleNumber = Texts.checkMaxLength(Texts.emptyToNull(articleNumber), StockItem.CODE_MAX, "Article number");
    }
}
