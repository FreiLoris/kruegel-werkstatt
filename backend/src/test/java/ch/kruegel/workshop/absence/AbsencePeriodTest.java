package ch.kruegel.workshop.absence;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
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
