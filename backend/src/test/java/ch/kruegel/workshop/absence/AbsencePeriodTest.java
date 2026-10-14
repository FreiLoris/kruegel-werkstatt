package ch.kruegel.workshop.absence;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The period of an absence on its own – half days included. */
class AbsencePeriodTest {

    private static final LocalDate MON = LocalDate.of(2026, 10, 12);
    private static final LocalDate TUE = MON.plusDays(1);

    @Test
    void startAndEndToTheHalfDay() {
        AbsencePeriod afternoonToNoon = new AbsencePeriod(MON, true, TUE, true);

        assertThat(afternoonToNoon.start()).isEqualTo(MON.atTime(12, 0));
        assertThat(afternoonToNoon.end()).isEqualTo(TUE.atTime(12, 0));
        assertThat(AbsencePeriod.days(MON, MON).end()).isEqualTo(TUE.atStartOfDay());
    }

    @Test
    void morningAndAfternoonOfOneDayDoNotOverlap() {
        AbsencePeriod morning = new AbsencePeriod(MON, false, MON, true);
        AbsencePeriod afternoon = new AbsencePeriod(MON, true, MON, false);

        assertThat(morning.overlaps(afternoon)).isFalse();
        assertThat(morning.overlaps(AbsencePeriod.days(MON, TUE))).isTrue();
        // back to back over the night is fine too
        assertThat(AbsencePeriod.days(MON, MON).overlaps(AbsencePeriod.days(TUE, TUE))).isFalse();
    }

    @Test
    void timesToTheMinute() {
        AbsencePeriod doctor = AbsencePeriod.times(MON, LocalTime.of(9, 0), MON, LocalTime.of(10, 30));

        assertThat(doctor.start()).isEqualTo(MON.atTime(9, 0));
        assertThat(doctor.end()).isEqualTo(MON.atTime(10, 30));
        assertThat(doctor.overlaps(AbsencePeriod.times(MON, LocalTime.of(10, 30), MON, null))).isFalse();
        assertThat(doctor.overlaps(AbsencePeriod.times(MON, null, MON, LocalTime.of(9, 30)))).isTrue();
        assertThatThrownBy(() -> AbsencePeriod.times(MON, LocalTime.of(10, 0), MON, LocalTime.of(9, 0)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aTimeCountsTheHalvesOfTheDayItTouches() {
        Predicate<LocalDate> everyDay = day -> true;

        assertThat(AbsencePeriod.times(MON, LocalTime.of(9, 0), MON, LocalTime.of(10, 30)).workingHalfDays(MON, MON, everyDay)).isEqualTo(1);
        assertThat(AbsencePeriod.times(MON, LocalTime.of(13, 0), MON, null).workingHalfDays(MON, MON, everyDay)).isEqualTo(1);
        assertThat(AbsencePeriod.times(MON, LocalTime.of(11, 0), MON, LocalTime.of(14, 0)).workingHalfDays(MON, MON, everyDay)).isEqualTo(2);
        // from Monday 14:00 to Tuesday 11:00: one half each
        assertThat(AbsencePeriod.times(MON, LocalTime.of(14, 0), TUE, LocalTime.of(11, 0)).workingHalfDays(MON, TUE, everyDay)).isEqualTo(2);
    }

    @Test
    void countsHalfWorkingDaysInsideTheGivenDays() {
        // Fri afternoon – Tue noon, the weekend in between; a "holiday" on Monday
        LocalDate fri = MON.minusDays(3);
        AbsencePeriod period = new AbsencePeriod(fri, true, TUE, true);
        Predicate<LocalDate> weekdays = day -> day.getDayOfWeek().getValue() <= 5;

        assertThat(period.workingHalfDays(fri, TUE, weekdays)).isEqualTo(1 + 2 + 1);
        assertThat(period.workingHalfDays(fri, TUE, weekdays.and(day -> !day.equals(MON)))).isEqualTo(1 + 1);
        // only the part inside [from, to] counts
        assertThat(period.workingHalfDays(MON, MON.plusDays(30), weekdays)).isEqualTo(2 + 1);
        assertThat(period.workingHalfDays(TUE.plusDays(1), TUE.plusDays(9), weekdays)).isZero();
    }

    @Test
    void impossiblePeriodsAreRefused() {
        assertThatThrownBy(() -> AbsencePeriod.days(TUE, MON)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AbsencePeriod(MON, true, MON, true)).isInstanceOf(IllegalArgumentException.class);
    }
}
