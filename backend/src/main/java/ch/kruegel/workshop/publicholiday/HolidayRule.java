package ch.kruegel.workshop.publicholiday;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.temporal.TemporalAdjusters;
import java.util.function.IntFunction;

/**
 * Every public holiday a Swiss workshop may have (neutral 2) – which ones apply is chosen in the
 * settings ({@link PublicHolidaySettings}); the cantons differ too much for a fixed list per canton.
 * The names stay as the workshops know them. Stored by the enum's name: never rename one.
 */
public enum HolidayRule {

    NEUJAHR("Neujahr", fixed(1, 1)),
    BERCHTOLDSTAG("Berchtoldstag", fixed(1, 2)),
    DREIKOENIGSTAG("Dreikönigstag", fixed(1, 6)),
    JOSEFSTAG("Josefstag", fixed(3, 19)),
    KARFREITAG("Karfreitag", easter(-2)),
    OSTERSONNTAG("Ostersonntag", easter(0)),
    OSTERMONTAG("Ostermontag", easter(1)),
    /** Glarus: the first Thursday in April – in Holy Week, the Thursday after Easter */
    NAEFELSER_FAHRT("Näfelser Fahrt", HolidayRule::naefelserFahrt),
    TAG_DER_ARBEIT("Tag der Arbeit", fixed(5, 1)),
    AUFFAHRT("Auffahrt", easter(39)),
    PFINGSTSONNTAG("Pfingstsonntag", easter(49)),
    PFINGSTMONTAG("Pfingstmontag", easter(50)),
    FRONLEICHNAM("Fronleichnam", easter(60)),
    /** Jura */
    JURA_UNABHAENGIGKEIT("Unabhängigkeitstag Jura", fixed(6, 23)),
    PETER_UND_PAUL("Peter und Paul", fixed(6, 29)),
    NATIONALFEIERTAG("Nationalfeiertag", fixed(8, 1)),
    MARIAE_HIMMELFAHRT("Mariä Himmelfahrt", fixed(8, 15)),
    /** Geneva: the Thursday after the first Sunday in September */
    GENFER_BETTAG("Genfer Bettag", year -> firstSundayOfSeptember(year).plusDays(4)),
    /** The Monday after the Federal Day of Prayer, the third Sunday in September */
    BETTAGSMONTAG("Bettagsmontag", year -> firstSundayOfSeptember(year).plusWeeks(2).plusDays(1)),
    BRUDER_KLAUS("Bruder Klaus", fixed(9, 25)),
    ALLERHEILIGEN("Allerheiligen", fixed(11, 1)),
    MARIAE_EMPFAENGNIS("Mariä Empfängnis", fixed(12, 8)),
    WEIHNACHTEN("Weihnachten", fixed(12, 25)),
    STEPHANSTAG("Stephanstag", fixed(12, 26)),
    /** Geneva */
    RESTAURATION_GENF("Restauration der Republik", fixed(12, 31));

    private final String holidayName;
    private final IntFunction<LocalDate> date;

    HolidayRule(String holidayName, IntFunction<LocalDate> date) {
        this.holidayName = holidayName;
        this.date = date;
    }

    /** German, as shown – e.g. "Auffahrt" */
    public String holidayName() {
        return holidayName;
    }

    public PublicHoliday in(int year) {
        return new PublicHoliday(date.apply(year), holidayName);
    }

    private static IntFunction<LocalDate> fixed(int month, int day) {
        MonthDay monthDay = MonthDay.of(month, day);
        return monthDay::atYear;
    }

    private static IntFunction<LocalDate> easter(int daysAfter) {
        return year -> EasterSunday.of(year).plusDays(daysAfter);
    }

    private static LocalDate firstSundayOfSeptember(int year) {
        return LocalDate.of(year, 9, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
    }

    private static LocalDate naefelserFahrt(int year) {
        LocalDate firstThursday = LocalDate.of(year, 4, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.THURSDAY));
        LocalDate easter = EasterSunday.of(year);
        boolean holyWeek = !firstThursday.isBefore(easter.minusDays(6)) && firstThursday.isBefore(easter);
        return holyWeek ? firstThursday.plusWeeks(1) : firstThursday;
    }
}
