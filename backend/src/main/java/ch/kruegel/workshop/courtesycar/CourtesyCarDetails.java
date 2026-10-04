package ch.kruegel.workshop.courtesycar;

import ch.kruegel.workshop.common.LicensePlates;
import ch.kruegel.workshop.common.Texts;

import java.time.LocalDate;
import java.util.Objects;

/**
 * All freely editable details of a courtesy car – the same for creating and editing.
 *
 * <p>Cleans up the values on construction (whitespace, license plate in upper case with single
 * spaces, empty texts become {@code null}) and checks the rules. A {@link CourtesyCar} can
 * therefore never contain invalid data.
 *
 * @param name           how the workshop calls the car, 1–40 characters
 * @param model          optional, e.g. "VW Polo"
 * @param licensePlate   optional, e.g. "ZH 123456"
 * @param serviceDue     optional
 * @param insuranceUntil optional
 */
public record CourtesyCarDetails(
        String name,
        String model,
        String licensePlate,
        LocalDate serviceDue,
        LocalDate insuranceUntil) {

    static final int NAME_MAX = 40;
    static final int MODEL_MAX = 40;
    static final int LICENSE_PLATE_MAX = 15;

    public CourtesyCarDetails {
        Objects.requireNonNull(name, "name");
        name = name.strip();
        model = Texts.checkMaxLength(Texts.emptyToNull(model), MODEL_MAX, "Model");
        licensePlate = Texts.checkMaxLength(LicensePlates.normalize(licensePlate), LICENSE_PLATE_MAX, "License plate");

        if (name.isEmpty() || name.length() > NAME_MAX) {
            throw new IllegalArgumentException("Name must be 1–" + NAME_MAX + " characters: '" + name + "'");
        }
    }
}
