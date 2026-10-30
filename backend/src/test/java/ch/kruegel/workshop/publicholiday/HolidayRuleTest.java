package ch.kruegel.workshop.publicholiday;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class HolidayRuleTest {

    @Test
    void theMovingOnes2026() {
        // Easter 2026: April 5
        assertThat(HolidayRule.FRONLEICHNAM.in(2026).date()).isEqualTo(LocalDate.of(2026, 6, 4));
        // Sunday, September 6 → Thursday after it
        assertThat(HolidayRule.GENFER_BETTAG.in(2026).date()).isEqualTo(LocalDate.of(2026, 9, 10));
        // Federal Day of Prayer, September 20 → Monday after it
        assertThat(HolidayRule.BETTAGSMONTAG.in(2026).date()).isEqualTo(LocalDate.of(2026, 9, 21));
    }

    @Test
    void naefelserFahrt_aWeekLaterInHolyWeek() {
        // April 2, 2026 is the Thursday before Easter (April 5) → April 9
        assertThat(HolidayRule.NAEFELSER_FAHRT.in(2026).date()).isEqualTo(LocalDate.of(2026, 4, 9));
        // 2027: Easter March 28, first Thursday in April is April 1 – after Easter, stays
        assertThat(HolidayRule.NAEFELSER_FAHRT.in(2027).date()).isEqualTo(LocalDate.of(2027, 4, 1));
    }

    @Test
    void fixedOnesWithTheirNames() {
        assertThat(HolidayRule.MARIAE_HIMMELFAHRT.in(2026)).isEqualTo(new PublicHoliday(LocalDate.of(2026, 8, 15), "Mariä Himmelfahrt"));
        assertThat(HolidayRule.RESTAURATION_GENF.in(2027).date()).isEqualTo(LocalDate.of(2027, 12, 31));
    }
}
