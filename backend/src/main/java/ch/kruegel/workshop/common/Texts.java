package ch.kruegel.workshop.common;

/** Small helpers for optional text fields. */
public final class Texts {

    private Texts() {
    }

    /** Removes surrounding whitespace; empty or blank → {@code null} ("not set"). */
    public static String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.strip();
    }

    /** Throws if the (already cleaned) value is longer than {@code max}. */
    public static String checkMaxLength(String value, int max, String field) {
        if (value != null && value.length() > max) {
            throw new IllegalArgumentException(field + " must be at most " + max + " characters: '" + value + "'");
        }
        return value;
    }
}
