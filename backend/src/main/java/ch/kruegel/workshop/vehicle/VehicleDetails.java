package ch.kruegel.workshop.vehicle;

import ch.kruegel.workshop.common.LicensePlates;
import ch.kruegel.workshop.common.Texts;

import java.time.LocalDate;

/**
 * All details of a vehicle – the same for local input and the SwissGarage import.
 *
 * <p>Lenient like {@code CustomerDetails}: SwissGarage data is taken as it is. Hard rules only:
 * make or model must be known (same filter as the old import), plausible year and mileage.
 *
 * @param licensePlate      normalised ("ZH 123456"); NOT unique – the plate moves with the holder
 * @param vin               vehicle identification number (SwissGarage "Chassis-Nr.")
 * @param firstRegistration first registration (SwissGarage "1.Inv")
 * @param modelYear         SwissGarage "Jahrg."
 * @param mileageKm         last known mileage
 * @param lastMfk           date of the LAST official inspection (MFK) – the next one: {@link MfkSchedule}
 */
public record VehicleDetails(
        String licensePlate,
        String make,
        String model,
        String vin,
        LocalDate firstRegistration,
        Integer modelYear,
        Integer mileageKm,
        LocalDate lastMfk,
        String color,
        String fuel) {

    static final int MAX = 100;
    static final int LICENSE_PLATE_MAX = 20;

    public VehicleDetails {
        licensePlate = Texts.checkMaxLength(LicensePlates.normalize(licensePlate), LICENSE_PLATE_MAX, "License plate");
        make = clean(make, "Make");
        model = clean(model, "Model");
        vin = clean(vin, "VIN");
        color = clean(color, "Color");
        fuel = clean(fuel, "Fuel");

        if (make == null && model == null) {
            throw new IllegalArgumentException("A vehicle needs a make or a model");
        }
        if (modelYear != null && (modelYear < 1900 || modelYear > 2100)) {
            throw new IllegalArgumentException("Model year must be between 1900 and 2100: " + modelYear);
        }
        if (mileageKm != null && mileageKm < 0) {
            throw new IllegalArgumentException("Mileage must not be negative: " + mileageKm);
        }
    }

    /** "VW Golf" / "VW" / "Golf" – how the vehicle is shown in lists (plate shown separately). */
    public String description() {
        if (make == null) {
            return model;
        }
        return model == null ? make : make + " " + model;
    }

    private static String clean(String value, String field) {
        return Texts.checkMaxLength(Texts.emptyToNull(value), MAX, field);
    }
}
