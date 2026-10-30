package ch.kruegel.workshop.absence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Objects;
import java.util.function.Predicate;

/**
 * From when to when someone is away – whole days; the first day possibly only from noon or from a
 * time, the last day possibly only until noon or until a time (FB-05: a doctor 9:00–10:30). Half
 * days and times exclude each other: either "ab Mittag" or a start time.
 *
 * @param startDate       first day
 * @param startsAfternoon only the afternoon of the first day
 * @param startTime       from this time on the first day; empty = from the start of the day (or noon)
 * @param endDate         last day (inclusive)
 * @param endsNoon        only the morning of the last day
 * @param endTime         until this time on the last day; empty = to the end of the day (or noon)
 */
@Embeddable
public record AbsencePeriod(
        @Column(nullable = false) LocalDate startDate,
        boolean startsAfternoon,
        LocalTime startTime,
        @Column(nullable = false) LocalDate endDate,
        boolean endsNoon,
        LocalTime endTime) {

    private static final LocalTime NOON = LocalTime.NOON;

    public AbsencePeriod {
        Objects.requireNonNull(startDate, "startDate");
        Objects.requireNonNull(endDate, "endDate");
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End before start: " + startDate + " – " + endDate);
        }
        if ((startsAfternoon && startTime != null) || (endsNoon && endTime != null)) {
            throw new IllegalArgumentException("Half day or time, not both");
        }
        if (LocalTime.MIDNIGHT.equals(endTime)) {
            throw new IllegalArgumentException("Until 00:00 is before the last day");
        }
        if (!moment(startDate, startsAfternoon, startTime).isBefore(endMoment(endDate, endsNoon, endTime))) {
            throw new IllegalArgumentException("Nothing left of the period: " + startDate + " – " + endDate);
        }
    }

    /** Half days, without times (vacation) */
    public AbsencePeriod(LocalDate startDate, boolean startsAfternoon, LocalDate endDate, boolean endsNoon) {
        this(startDate, startsAfternoon, null, endDate, endsNoon, null);
    }

    /** Whole days from … to … */
    public static AbsencePeriod days(LocalDate from, LocalDate to) {
        return new AbsencePeriod(from, false, to, false);
    }

    /** With times; empty = from the start / to the end of the day */
    public static AbsencePeriod times(LocalDate from, LocalTime fromTime, LocalDate to, LocalTime toTime) {
        return new AbsencePeriod(from, false, fromTime, to, false, toTime);
    }

    /** The moment it starts – 00:00, noon or the start time of the first day */
    public LocalDateTime start() {
        return moment(startDate, startsAfternoon, startTime);
    }

    /** The moment it ends (exclusive) – the end time, noon of the last day or the next midnight */
    public LocalDateTime end() {
        return endMoment(endDate, endsNoon, endTime);
    }

    private static LocalDateTime moment(LocalDate date, boolean afternoon, LocalTime time) {
        if (time != null) {
            return date.atTime(time);
        }
        return date.atTime(afternoon ? NOON : LocalTime.MIDNIGHT);
    }

    private static LocalDateTime endMoment(LocalDate date, boolean noon, LocalTime time) {
        if (time != null) {
            return date.atTime(time);
        }
        return noon ? date.atTime(NOON) : date.plusDays(1).atStartOfDay();
    }

    /** The same rule as the database constraint: half-open, to the minute. */
    public boolean overlaps(AbsencePeriod other) {
        return start().isBefore(other.end()) && other.start().isBefore(end());
    }

    /**
     * How many HALF working days of this period lie in [from, to] (both inclusive) – in half days so
     * the count stays a whole number; 2 = one day. A half counts when the period touches it: a doctor
     * 9:00–10:30 is half a day, 11:00–14:00 a whole one. Weekends and public holidays do not count
     * (F6: the old app counted vacation over Saturday and Sunday).
     *
     * @param isWorkingDay e.g. {@code PublicHolidays::isWorkingDay}
     */
    public int workingHalfDays(LocalDate from, LocalDate to, Predicate<LocalDate> isWorkingDay) {
        LocalDate first = startDate.isAfter(from) ? startDate : from;
        LocalDate last = endDate.isBefore(to) ? endDate : to;
        int halves = 0;
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            if (!isWorkingDay.test(day)) {
                continue;
            }
            LocalDateTime noon = day.atTime(NOON);
            LocalDateTime dayStart = start().isAfter(day.atStartOfDay()) ? start() : day.atStartOfDay();
            LocalDateTime dayEnd = end().isBefore(day.plusDays(1).atStartOfDay()) ? end() : day.plusDays(1).atStartOfDay();
            halves += (dayStart.isBefore(noon) ? 1 : 0) + (dayEnd.isAfter(noon) ? 1 : 0);
        }
        return halves;
    }
}
