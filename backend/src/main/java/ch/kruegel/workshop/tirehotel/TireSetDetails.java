package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.vehicle.Vehicle;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * What is entered about a set (FB-07) – everything except its tread depths, which change only
 * with a measurement (they go into the history), and the days it was stored and retrieved.
 *
 * @param vehicle    may be open
 * @param rims       only with {@link TireSetKind#WHEELS}; may be unknown
 * @param hubCaps    the hub caps are stored with it
 * @param wheelBolts    "Radschrauben beachten" (FB-17): special bolts – the mechanic looks for the matching ones
 *                      in the car (they are not stored with the set)
 * @param year          the tyres' year of manufacture (from the DOT code) – one for the set
 * @param torque        tightening torque of the wheel bolts in Nm (FB-11); may be unknown
 * @param pressureFront tyre pressure front in bar, to a hundredth (FB-11); may be unknown
 * @param pressureRear  tyre pressure rear in bar (FB-11); may be unknown
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
        String remark,
        Integer torque,
        BigDecimal pressureFront,
        BigDecimal pressureRear) {

    static final int NAME_MAX = 60;
    static final int DIMENSION_MAX = 40;
    static final int REMARK_MAX = 500;
    static final int YEAR_MIN = 1990;
    static final int YEAR_MAX = 2100;
    static final int TORQUE_MIN = 10;
    static final int TORQUE_MAX = 999;
    static final String PRESSURE_MIN = "0.5";
    static final String PRESSURE_MAX = "9.99";

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
        if (torque != null && (torque < TORQUE_MIN || torque > TORQUE_MAX)) {
            throw new IllegalArgumentException("Torque out of range: " + torque);
        }
        pressureFront = checkedPressure(pressureFront, "front");
        pressureRear = checkedPressure(pressureRear, "rear");
    }

    /** A set without the values to mount it – e.g. taken over from SwissGarage */
    public TireSetDetails(Customer customer, Vehicle vehicle, Season season, TireSetKind kind, RimKind rims, boolean hubCaps,
                          boolean wheelBolts, String brand, String model, String dimension, Integer year, String remark) {
        this(customer, vehicle, season, kind, rims, hubCaps, wheelBolts, brand, model, dimension, year, remark, null, null, null);
    }

    private static BigDecimal checkedPressure(BigDecimal pressure, String axle) {
        if (pressure == null) {
            return null;
        }
        if (pressure.compareTo(new BigDecimal(PRESSURE_MIN)) < 0 || pressure.compareTo(new BigDecimal(PRESSURE_MAX)) > 0) {
            throw new IllegalArgumentException("Pressure " + axle + " out of range: " + pressure);
        }
        return pressure.setScale(2, RoundingMode.HALF_UP);
    }
}
