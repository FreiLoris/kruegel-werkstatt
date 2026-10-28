package ch.kruegel.workshop.supplier;

import ch.kruegel.workshop.common.Texts;
import jakarta.persistence.Embeddable;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * One way a supplier delivers (FB-30): e.g. "Tagesexpress", order until 09:30, tour 1, here about
 * 11:00 – or "Nachtexpress", order until 17:00, here the next morning at 07:30. Several per supplier.
 *
 * @param kind           Tagesexpress, Nachtexpress, Standardversand, Abholung, Kurier … – free text
 * @param orderDeadline  order until; empty = not known
 * @param arrival        about when it is here; empty = not known
 * @param arrivalNextDay the arrival is on the next working day
 * @param postage        CHF; empty = not known (a note like "ab CHF 100 gratis" goes into the remark)
 */
@Embeddable
public record SupplierDelivery(String kind, LocalTime orderDeadline, String tour, LocalTime arrival, boolean arrivalNextDay,
                               BigDecimal postage, String remark) {

    static final int KIND_MAX = 40;
    static final int TOUR_MAX = 60;
    static final int REMARK_MAX = 200;

    public SupplierDelivery {
        kind = Texts.checkMaxLength(Texts.emptyToNull(kind), KIND_MAX, "Kind");
        if (kind == null) {
            throw new IllegalArgumentException("A delivery needs its kind");
        }
        tour = Texts.checkMaxLength(Texts.emptyToNull(tour), TOUR_MAX, "Tour");
        remark = Texts.checkMaxLength(Texts.emptyToNull(remark), REMARK_MAX, "Remark");
        if (postage != null && postage.signum() < 0) {
            throw new IllegalArgumentException("Postage must not be negative");
        }
    }
}
