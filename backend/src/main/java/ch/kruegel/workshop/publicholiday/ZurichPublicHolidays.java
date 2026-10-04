package ch.kruegel.workshop.publicholiday;

import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * Public holidays of the canton of Zurich, computed – no database table.
 *
 * <p>The list is defined by law and changes (almost) never, so it lives in code with tests
 * instead of a maintenance screen. Same days as the old app, including Easter and Whit Sunday:
 * they are Sundays anyway, but calendars show their name.
 *
 * <p>Used later for the employee calendar (9b), vacation statistics – vacation days are working
 * days only (9c) – and the capacity overview.
 */
@Component
public class ZurichPublicHolidays {

    /** Same date every year */
    private static final List<FixedHoliday> FIXED = List.of(
            new FixedHoliday(MonthDay.of(1, 1), "Neujahr"),
            new FixedHoliday(MonthDay.of(1, 2), "Berchtoldstag"),
            new FixedHoliday(MonthDay.of(5, 1), "Tag der Arbeit"),
            new FixedHoliday(MonthDay.of(8, 1), "Nationalfeiertag"),
            new FixedHoliday(MonthDay.of(12, 25), "Weihnachten"),
            new FixedHoliday(MonthDay.of(12, 26), "Stephanstag"));

    /** Days relative to Easter Sunday */
    private static final List<EasterHoliday> EASTER_BASED = List.of(
            new EasterHoliday(-2, "Karfreitag"),
            new EasterHoliday(0, "Ostersonntag"),
            new EasterHoliday(1, "Ostermontag"),
            new EasterHoliday(39, "Auffahrt"),
            new EasterHoliday(49, "Pfingstsonntag"),
            new EasterHoliday(50, "Pfingstmontag"));

    private record FixedHoliday(MonthDay day, String name) {
    }

    private record EasterHoliday(int daysAfterEaster, String name) {
    }

    /** All public holidays of a year, sorted by date. */
    public List<PublicHoliday> forYear(int year) {
        LocalDate easter = EasterSunday.of(year);
        return Stream.concat(
                        FIXED.stream().map(h -> new PublicHoliday(h.day().atYear(year), h.name())),
                        EASTER_BASED.stream().map(h -> new PublicHoliday(easter.plusDays(h.daysAfterEaster()), h.name())))
                .sorted(Comparator.comparing(PublicHoliday::date))
                .toList();
    }

    /** All public holidays from {@code from} to {@code to} (both inclusive), sorted by date. */
    public List<PublicHoliday> between(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), year -> year <= to.getYear(), year -> year + 1)
                .flatMap(year -> forYear(year).stream())
                .filter(h -> !h.date().isBefore(from) && !h.date().isAfter(to))
                .toList();
    }

    public boolean isPublicHoliday(LocalDate date) {
        return forYear(date.getYear()).stream().anyMatch(h -> h.date().equals(date));
    }

    /** Monday to Friday and not a public holiday – e.g. for counting vacation days. */
    public boolean isWorkingDay(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY && !isPublicHoliday(date);
    }
}
