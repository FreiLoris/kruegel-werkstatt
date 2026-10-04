package ch.kruegel.workshop.vehicle;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class MfkScheduleTest {

    private static final LocalDate REGISTERED = LocalDate.of(2019, 3, 15);

    @Test
    void firstInspectionFourYearsAfterRegistration() {
        assertThat(MfkSchedule.nextDue(REGISTERED, null)).isEqualTo(LocalDate.of(2023, 3, 15));
    }

    @Test
    void threeYearsAfterTheFirstInspection() {
        assertThat(MfkSchedule.nextDue(REGISTERED, LocalDate.of(2023, 4, 2))).isEqualTo(LocalDate.of(2026, 4, 2));
    }

    @Test
    void everyTwoYearsAfterThat() {
        assertThat(MfkSchedule.nextDue(REGISTERED, LocalDate.of(2026, 5, 10))).isEqualTo(LocalDate.of(2028, 5, 10));
    }

    @Test
    void withoutRegistrationDateTheShortIntervalIsAssumed() {
        // safer to warn a year too early than too late
        assertThat(MfkSchedule.nextDue(null, LocalDate.of(2025, 6, 1))).isEqualTo(LocalDate.of(2027, 6, 1));
    }

    @Test
    void nothingKnownNothingEstimated() {
        assertThat(MfkSchedule.nextDue(null, null)).isNull();
    }
}
