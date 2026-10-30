package ch.kruegel.workshop.dataimport;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.Year;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads dates and numbers as other programs write them (neutral 5). Not readable →
 * {@link IllegalArgumentException}; the import leaves the field empty and says so.
 */
final class ImportValues {

    private static final Pattern SWISS_DATE = Pattern.compile("(\\d{1,2})[./](\\d{1,2})[./](\\d{2}|\\d{4})");
    private static final Pattern ISO_DATE = Pattern.compile("(\\d{4})-(\\d{1,2})-(\\d{1,2})");
    /** "03.2015", "3/2015" – the vehicle papers often only have month and year */
    private static final Pattern MONTH_YEAR = Pattern.compile("(\\d{1,2})[./](\\d{4})");
    /** "123'456", "123.456", "123 456" – thousands separated */
    private static final Pattern THOUSANDS = Pattern.compile("\\d{1,3}([.,]\\d{3})+");
    /** "8400 Winterthur", "CH-8400 Winterthur" */
    private static final Pattern POSTAL_CODE_CITY = Pattern.compile("(?i)(?:CH\\s*-?\\s*)?(\\d{4,5})\\s+(.+)");

    private ImportValues() {
    }

    /** "31.12.2015", "31.12.15", "2015-12-31" (also with a time after it), "12.2015" → first of the month */
    static LocalDate date(String value) {
        if (value.isBlank()) {
            return null;
        }
        String text = value.strip().split("[ T]")[0];
        LocalDate date;
        try {
            Matcher m;
            if ((m = SWISS_DATE.matcher(text)).matches()) {
                date = LocalDate.of(year(m.group(3)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)));
            } else if ((m = ISO_DATE.matcher(text)).matches()) {
                date = LocalDate.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)));
            } else if ((m = MONTH_YEAR.matcher(text)).matches()) {
                date = LocalDate.of(Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)), 1);
            } else {
                throw new IllegalArgumentException("kein Datum");
            }
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("kein gültiges Datum");
        }
        if (date.getYear() < 1900 || date.getYear() > 2100) {
            throw new IllegalArgumentException("unplausibles Datum");
        }
        return date;
    }

    /** Two digits: this century up to the current year, else the last one ("15" → 2015, "85" → 1985) */
    private static int year(String digits) {
        int year = Integer.parseInt(digits);
        if (digits.length() == 4) {
            return year;
        }
        int century = Year.now().getValue() / 100 * 100;
        return century + year <= Year.now().getValue() ? century + year : century - 100 + year;
    }

    /** "123'456 km", "123.456", "123456.0" → 123456; decimals are cut off */
    static Integer integer(String value) {
        if (value.isBlank()) {
            return null;
        }
        String text = value.strip().replaceAll("(?i)km", "").replaceAll("[\\s'’]", "");
        if (THOUSANDS.matcher(text).matches()) {
            text = text.replaceAll("[.,]", "");
        }
        try {
            return new BigDecimal(text.replace(',', '.')).setScale(0, RoundingMode.DOWN).intValueExact();
        } catch (NumberFormatException | ArithmeticException e) {
            throw new IllegalArgumentException("keine Zahl");
        }
    }

    /** A model year 1900–2100 – also out of a date ("01.01.2015" → 2015) */
    static Integer modelYear(String value) {
        if (value.isBlank()) {
            return null;
        }
        Integer year = value.matches(".*\\d[./-]\\d.*") ? date(value).getYear() : integer(value);
        if (year < 1900 || year > 2100) {
            throw new IllegalArgumentException("kein Jahrgang");
        }
        return year;
    }

    /** "8400 Winterthur" → postal code and city; no postal code in front → all of it is the city */
    static String[] splitPostalCodeCity(String value) {
        Matcher m = POSTAL_CODE_CITY.matcher(value.strip());
        return m.matches() ? new String[] {m.group(1), m.group(2).strip()} : new String[] {"", value.strip()};
    }
}
