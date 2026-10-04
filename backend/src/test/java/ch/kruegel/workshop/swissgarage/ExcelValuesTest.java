package ch.kruegel.workshop.swissgarage;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExcelValuesTest {

    @Test
    void excelDayNumberBecomesDate() {
        // 45000 days after 1899-12-30
        assertThat(ExcelValues.date("45000")).isEqualTo(LocalDate.of(2023, 3, 15));
    }

    @Test
    void swissDateTextIsAcceptedToo() {
        assertThat(ExcelValues.date("5.7.2019")).isEqualTo(LocalDate.of(2019, 7, 5));
    }

    @Test
    void emptyIsNull() {
        assertThat(ExcelValues.date(" ")).isNull();
        assertThat(ExcelValues.integer("")).isNull();
    }

    @Test
    void implausibleOrInvalidDatesAreRejected() {
        assertThatThrownBy(() -> ExcelValues.date("900000")).hasMessage("unplausibles Datum");
        assertThatThrownBy(() -> ExcelValues.date("bald")).hasMessage("kein Datum");
    }

    @Test
    void integersAreCutNotRounded() {
        assertThat(ExcelValues.integer("123456.7")).isEqualTo(123456);
        assertThatThrownBy(() -> ExcelValues.integer("viel")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ExcelValues.integer("99999999999")).isInstanceOf(IllegalArgumentException.class);
    }
}
