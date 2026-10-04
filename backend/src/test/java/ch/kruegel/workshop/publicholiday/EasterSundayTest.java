package ch.kruegel.workshop.publicholiday;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class EasterSundayTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
            "2024, 2024-03-31",
            "2025, 2025-04-20",
            "2026, 2026-04-05",
            "2027, 2027-03-28",
            "2028, 2028-04-16",
            "2019, 2019-04-21",
            // Edge cases: earliest and latest possible Easter Sunday
            "2285, 2285-03-22",
            "2038, 2038-04-25",
            // Years where the simple Gauss formula needs special rules
            "1981, 1981-04-19",
            "1954, 1954-04-18",
    })
    void matchesKnownDates(int year, LocalDate expected) {
        assertThat(EasterSunday.of(year)).isEqualTo(expected);
    }
}
