package ch.kruegel.workshop.absence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Objects;
import java.util.function.Predicate;

/**
 * From when to when someone is away – whole days, the first day possibly only from noon, the last
 * day possibly only until noon.
 *
 * @param startDate       first day
 * @param startsAfternoon only the afternoon of the first day
 * @param endDate         last day (inclusive)
 * @param endsNoon        only the morning of the last day
 */
@Embeddable
public record AbsencePeriod(
        @Column(nullable = false) LocalDate startDate,
        boolean startsAfternoon,
        @Column(nullable = false) LocalDate endDate,
        boolean endsNoon) {

    private static final LocalTime NOON = LocalTime.NOON;

    public AbsencePeriod {
        Objects.requireNonNull(startDate, "startDate");
        Objects.requireNonNull(endDate, "endDate");
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End before start: " + startDate + " – " + endDate);
        }
        if (startDate.equals(endDate) && startsAfternoon && endsNoon) {
            throw new IllegalArgumentException("One day cannot be only afternoon and only morning: " + startDate);
        }
    }

    /** Whole days from … to … */
    public static AbsencePeriod days(LocalDate from, LocalDate to) {
        return new AbsencePeriod(from, false, to, false);
    }

    /** The moment it starts – 00:00 or noon of the first day */
    public LocalDateTime start() {
        return startDate.atTime(startsAfternoon ? NOON : LocalTime.MIDNIGHT);
    }

    /** The moment it ends (exclusive) – noon of the last day or the next midnight */
    public LocalDateTime end() {
        return endsNoon ? endDate.atTime(NOON) : endDate.plusDays(1).atStartOfDay();
    }

    /** The same rule as the database constraint: half-open, to the half day. */
    public boolean overlaps(AbsencePeriod other) {
        return start().isBefore(other.end()) && other.start().isBefore(end());
    }

    /**
     * How many HALF working days of this period lie in [from, to] (both inclusive) – in half days so
     * the count stays a whole number; 2 = one day. Weekends and public holidays do not count (F6:
     * the old app counted vacation over Saturday and Sunday).
     *
     * @param isWorkingDay e.g. {@code ZurichPublicHolidays::isWorkingDay}
     */
    public int workingHalfDays(LocalDate from, LocalDate to, Predicate<LocalDate> isWorkingDay) {
        LocalDate first = startDate.isAfter(from) ? startDate : from;
        LocalDate last = endDate.isBefore(to) ? endDate : to;
        int halves = 0;
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            if (!isWorkingDay.test(day)) {
                continue;
            }
            boolean onlyAfternoon = day.equals(startDate) && startsAfternoon;
            boolean onlyMorning = day.equals(endDate) && endsNoon;
            halves += onlyAfternoon || onlyMorning ? 1 : 2;
        }
        return halves;
    }
}
