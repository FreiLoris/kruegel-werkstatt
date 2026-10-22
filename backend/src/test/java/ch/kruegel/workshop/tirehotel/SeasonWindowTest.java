package ch.kruegel.workshop.tirehotel;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.MonthDay;

import static org.assertj.core.api.Assertions.assertThat;

/** Which change season is shown (FB-21) – deadlines 1 June and 1 December. */
class SeasonWindowTest {

    private static final MonthDay SUMMER = MonthDay.of(6, 1);
    private static final MonthDay WINTER = MonthDay.of(12, 1);

    private static SeasonWindow at(String day) {
        return SeasonWindow.at(LocalDate.parse(day), SUMMER, WINTER);
    }

    @Test
    void inOctoberTheWinterChangeCountingFromJune() {
        assertThat(at("2026-10-23")).isEqualTo(new SeasonWindow(Season.WINTER, LocalDate.parse("2026-12-01"), LocalDate.parse("2026-06-01"), false));
    }

    @Test
    void afterTheDeadlineTheSameSeasonStaysAWhile_overdue() {
        assertThat(at("2027-01-15")).isEqualTo(new SeasonWindow(Season.WINTER, LocalDate.parse("2026-12-01"), LocalDate.parse("2026-06-01"), true));
    }

    @Test
    void inSpringTheSummerChangeCountingFromDecember() {
        assertThat(at("2027-04-10")).isEqualTo(new SeasonWindow(Season.SUMMER, LocalDate.parse("2027-06-01"), LocalDate.parse("2026-12-01"), false));
    }

    @Test
    void onTheDeadlineItselfNotOverdueYet() {
        assertThat(at("2026-12-01").overdue()).isFalse();
        assertThat(at("2026-12-02").overdue()).isTrue();
    }

    @Test
    void halfwayTheComingOne() {
        // 1 September is 92 days after 1 June and 91 before 1 December
        assertThat(at("2026-09-01").season()).isEqualTo(Season.WINTER);
        assertThat(at("2026-08-30").season()).isEqualTo(Season.SUMMER);
    }

    @Test
    void otherDeadlinesFromTheSettings() {
        SeasonWindow window = SeasonWindow.at(LocalDate.parse("2026-10-23"), MonthDay.of(5, 15), MonthDay.of(11, 15));
        assertThat(window.deadline()).isEqualTo(LocalDate.parse("2026-11-15"));
        assertThat(window.from()).isEqualTo(LocalDate.parse("2026-05-15"));
        assertThat(window.other()).isEqualTo(Season.SUMMER);
    }
}
