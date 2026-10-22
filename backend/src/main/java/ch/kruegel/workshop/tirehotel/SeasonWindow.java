package ch.kruegel.workshop.tirehotel;

import java.time.LocalDate;
import java.time.MonthDay;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.stream.Stream;

/**
 * The tyre change season shown (FB-21): the one whose deadline is nearest to today. So the winter
 * change is shown from about September – and still a while after 1 December, when the customers
 * who forgot it are the ones to call. A change counts from the deadline before (of the other
 * season) on: for winter from 1 June, for summer from 1 December.
 *
 * @param season   the tyres going on now (SUMMER or WINTER)
 * @param deadline by then the change should be done
 * @param from     changes from this day on count for this season
 * @param overdue  the deadline is over – who has not changed yet "forgot"
 */
public record SeasonWindow(Season season, LocalDate deadline, LocalDate from, boolean overdue) {

    public static SeasonWindow at(LocalDate today, MonthDay summerDeadline, MonthDay winterDeadline) {
        LocalDate deadline = Stream.of(-1, 0, 1)
                .flatMap(years -> Stream.of(summerDeadline, winterDeadline).map(d -> d.atYear(today.getYear() + years)))
                .min(Comparator.comparingLong((LocalDate d) -> Math.abs(ChronoUnit.DAYS.between(today, d)))
                        // exactly between two deadlines: the coming one
                        .thenComparing(d -> d.isBefore(today)))
                .orElseThrow();
        boolean summer = MonthDay.from(deadline).equals(summerDeadline);
        Season season = summer ? Season.SUMMER : Season.WINTER;
        LocalDate from = lastBefore(summer ? winterDeadline : summerDeadline, deadline);
        return new SeasonWindow(season, deadline, from, today.isAfter(deadline));
    }

    /** The last day `deadline` falls on before `day` */
    static LocalDate lastBefore(MonthDay deadline, LocalDate day) {
        LocalDate sameYear = deadline.atYear(day.getYear());
        return sameYear.isBefore(day) ? sameYear : deadline.atYear(day.getYear() - 1);
    }

    /** The tyres coming off now */
    public Season other() {
        return season == Season.SUMMER ? Season.WINTER : Season.SUMMER;
    }
}
