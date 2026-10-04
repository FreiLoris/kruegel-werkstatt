package ch.kruegel.workshop.courtesycar;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DueStatusTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);

    @Test
    void noDateMeansNoStatus() {
        assertThat(DueStatus.of(null, TODAY)).isNull();
    }

    @Test
    void yesterdayIsOverdue() {
        assertThat(DueStatus.of(TODAY.minusDays(1), TODAY)).isEqualTo(DueStatus.OVERDUE);
    }

    @Test
    void todayAndTheNext30DaysAreDueSoon() {
        assertThat(DueStatus.of(TODAY, TODAY)).isEqualTo(DueStatus.DUE_SOON);
        assertThat(DueStatus.of(TODAY.plusDays(30), TODAY)).isEqualTo(DueStatus.DUE_SOON);
    }

    @Test
    void laterIsOk() {
        assertThat(DueStatus.of(TODAY.plusDays(31), TODAY)).isEqualTo(DueStatus.OK);
    }
}
