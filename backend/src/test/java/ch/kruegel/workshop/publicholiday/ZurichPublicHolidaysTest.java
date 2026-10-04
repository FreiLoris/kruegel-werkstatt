package ch.kruegel.workshop.publicholiday;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Plain unit test – the calculator needs neither Spring nor a database. */
class ZurichPublicHolidaysTest {

    private final ZurichPublicHolidays holidays = new ZurichPublicHolidays();

    @Test
    void all2026HolidaysInOrder() {
        assertThat(holidays.forYear(2026)).containsExactly(
                new PublicHoliday(LocalDate.of(2026, 1, 1), "Neujahr"),
                new PublicHoliday(LocalDate.of(2026, 1, 2), "Berchtoldstag"),
                new PublicHoliday(LocalDate.of(2026, 4, 3), "Karfreitag"),
                new PublicHoliday(LocalDate.of(2026, 4, 5), "Ostersonntag"),
                new PublicHoliday(LocalDate.of(2026, 4, 6), "Ostermontag"),
                new PublicHoliday(LocalDate.of(2026, 5, 1), "Tag der Arbeit"),
                new PublicHoliday(LocalDate.of(2026, 5, 14), "Auffahrt"),
                new PublicHoliday(LocalDate.of(2026, 5, 24), "Pfingstsonntag"),
                new PublicHoliday(LocalDate.of(2026, 5, 25), "Pfingstmontag"),
                new PublicHoliday(LocalDate.of(2026, 8, 1), "Nationalfeiertag"),
                new PublicHoliday(LocalDate.of(2026, 12, 25), "Weihnachten"),
                new PublicHoliday(LocalDate.of(2026, 12, 26), "Stephanstag"));
    }

    @Test
    void sortsEvenWhenEasterHolidaysOverlapFixedOnes() {
        // 2038: latest Easter (April 25) → Ascension on June 3, Whit Monday on June 14
        assertThat(holidays.forYear(2038)).extracting(PublicHoliday::date).isSorted();
    }

    @Test
    void periodAcrossTheTurnOfTheYear() {
        assertThat(holidays.between(LocalDate.of(2026, 12, 24), LocalDate.of(2027, 1, 3)))
                .extracting(PublicHoliday::name)
                .containsExactly("Weihnachten", "Stephanstag", "Neujahr", "Berchtoldstag");
    }

    @Test
    void periodBoundsAreInclusive() {
        assertThat(holidays.between(LocalDate.of(2026, 5, 14), LocalDate.of(2026, 5, 14)))
                .extracting(PublicHoliday::name)
                .containsExactly("Auffahrt");
    }

    @Test
    void workingDayIsMondayToFridayWithoutHolidays() {
        assertThat(holidays.isWorkingDay(LocalDate.of(2026, 5, 13))).isTrue();   // Wednesday
        assertThat(holidays.isWorkingDay(LocalDate.of(2026, 5, 14))).isFalse();  // Thursday, Auffahrt
        assertThat(holidays.isWorkingDay(LocalDate.of(2026, 5, 16))).isFalse();  // Saturday
        assertThat(holidays.isWorkingDay(LocalDate.of(2026, 5, 17))).isFalse();  // Sunday
    }
}
