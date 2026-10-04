package ch.kruegel.workshop.task;

import ch.kruegel.workshop.common.Texts;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.time.LocalDate;
import java.util.Objects;

/**
 * Parts that have to be ordered for a task ("Material bestellen").
 * A task without parts has no {@code PartsOrder} at all (all columns empty).
 *
 * @param description what is needed, e.g. "Bremsscheiben vorne"
 * @param supplier    e.g. "Derendinger" – usually known once ordered
 * @param orderedOn   day of the order
 */
@Embeddable
public record PartsOrder(
        @Column(name = "parts_description") String description,
        @Enumerated(EnumType.STRING) @Column(name = "parts_status") PartsStatus status,
        @Column(name = "parts_supplier") String supplier,
        @Column(name = "parts_ordered_on") LocalDate orderedOn) {

    static final int DESCRIPTION_MAX = 500;
    static final int SUPPLIER_MAX = 100;

    public PartsOrder {
        description = Texts.checkMaxLength(Texts.emptyToNull(description), DESCRIPTION_MAX, "Parts description");
        supplier = Texts.checkMaxLength(Texts.emptyToNull(supplier), SUPPLIER_MAX, "Supplier");
        if (description == null) {
            throw new IllegalArgumentException("Parts need a description");
        }
        Objects.requireNonNull(status, "status");
    }

    /** Parts still to be ordered. */
    public static PartsOrder toOrder(String description) {
        return new PartsOrder(description, PartsStatus.TO_ORDER, null, null);
    }
}
