package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.vehicle.Vehicle;

import java.util.Objects;

/**
 * What is entered about a set (FB-07) – everything except its tread depths, which change only
 * with a measurement (they go into the history), and the days it was stored and retrieved.
 *
 * @param vehicle    may be open
 * @param rims       only with {@link TireSetKind#WHEELS}; may be unknown
 * @param hubCaps    the hub caps are stored with it
 * @param wheelBolts the wheel bolts are stored with it
 * @param year       the tyres' year of manufacture (from the DOT code) – one for the set
 */
public record TireSetDetails(
        Customer customer,
        Vehicle vehicle,
        Season season,
        TireSetKind kind,
        RimKind rims,
        boolean hubCaps,
        boolean wheelBolts,
        String brand,
        String model,
        String dimension,
        Integer year,
        String remark) {

    static final int NAME_MAX = 60;
    static final int DIMENSION_MAX = 40;
    static final int REMARK_MAX = 500;
    static final int YEAR_MIN = 1990;
    static final int YEAR_MAX = 2100;

    public TireSetDetails {
        Objects.requireNonNull(customer, "customer");
        Objects.requireNonNull(season, "season");
        Objects.requireNonNull(kind, "kind");
        if (kind != TireSetKind.WHEELS && rims != null) {
            throw new IllegalArgumentException("Rims only with complete wheels");
        }
        if (year != null && (year < YEAR_MIN || year > YEAR_MAX)) {
            throw new IllegalArgumentException("Year out of range: " + year);
        }
        brand = Texts.checkMaxLength(Texts.emptyToNull(brand), NAME_MAX, "Brand");
        model = Texts.checkMaxLength(Texts.emptyToNull(model), NAME_MAX, "Model");
        dimension = Texts.checkMaxLength(Texts.emptyToNull(dimension), DIMENSION_MAX, "Dimension");
        remark = Texts.checkMaxLength(Texts.emptyToNull(remark), REMARK_MAX, "Remark");
    }
}
