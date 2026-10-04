package ch.kruegel.workshop.swissgarage;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Converts Excel cell texts (as delivered by {@link ExcelSheet}) into numbers and dates.
 * Invalid values throw {@link IllegalArgumentException} with a German message for the import log.
 */
final class ExcelValues {

    /** Day 0 of Excel's date numbers (because of an old Lotus bug it is Dec 30, not Dec 31, 1899) */
    private static final LocalDate EXCEL_EPOCH = LocalDate.of(1899, 12, 30);
    private static final DateTimeFormatter SWISS_DATE = DateTimeFormatter.ofPattern("d.M.yyyy");

    private ExcelValues() {
    }

    /**
     * Excel stores dates as day numbers (46000 = 2025-12-09); some exports contain "15.10.2026" as text.
     * Empty → {@code null}. Only plausible dates (1950–2100) are accepted.
     */
    static LocalDate date(String value) {
        if (value.isBlank()) {
            return null;
        }
        LocalDate date;
        try {
            date = EXCEL_EPOCH.plusDays(new BigDecimal(value).longValue());
        } catch (NumberFormatException notANumber) {
            try {
                date = LocalDate.parse(value.strip(), SWISS_DATE);
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("kein Datum");
            }
        }
        if (date.getYear() < 1950 || date.getYear() > 2100) {
            throw new IllegalArgumentException("unplausibles Datum");
        }
        return date;
    }

    /** Whole number; empty → {@code null}. Decimals are cut off (mileage 123456.7 → 123456). */
    static Integer integer(String value) {
        if (value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.strip()).setScale(0, RoundingMode.DOWN).intValueExact();
        } catch (NumberFormatException | ArithmeticException e) {
            // not a number, or too large for an int
            throw new IllegalArgumentException("keine gültige Zahl");
        }
    }
}
