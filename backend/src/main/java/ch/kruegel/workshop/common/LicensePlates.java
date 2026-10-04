package ch.kruegel.workshop.common;

import java.util.Locale;

/**
 * Swiss license plates are typed in many ways (" zh  123456", "Zh 123456"). One written form
 * makes searching and comparing reliable. Used by courtesy cars and customer vehicles.
 */
public final class LicensePlates {

    private LicensePlates() {
    }

    /** " zh  123456 " → "ZH 123456"; empty → {@code null}. Does not insert missing spaces. */
    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.strip().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }
}
