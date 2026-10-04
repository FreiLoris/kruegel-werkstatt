package ch.kruegel.workshop.publicholiday;

import java.time.LocalDate;

/**
 * Date of Easter Sunday in the Gregorian calendar.
 *
 * <p>Several public holidays move with Easter (Good Friday, Easter Monday, Ascension,
 * Whit Monday), so this is the basis for {@link ZurichPublicHolidays}.
 *
 * <p>Algorithm: "Anonymous Gregorian algorithm" (Meeus/Jones/Butcher). It is exact for every
 * year of the Gregorian calendar – unlike the simple Gauss formula, which needs extra rules
 * for some years.
 */
final class EasterSunday {

    private EasterSunday() {
    }

    static LocalDate of(int year) {
        int a = year % 19;                      // position in the 19-year moon cycle
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30; // days from March 21 to the full moon
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7; // days from the full moon to the next Sunday
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = ((h + l - 7 * m + 114) % 31) + 1;
        return LocalDate.of(year, month, day);
    }
}
