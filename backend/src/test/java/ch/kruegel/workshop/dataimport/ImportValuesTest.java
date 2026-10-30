package ch.kruegel.workshop.dataimport;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.Year;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImportValuesTest {

    @Test
    void dates_asOtherProgramsWriteThem() {
        LocalDate expected = LocalDate.of(2015, 3, 31);
        assertThat(ImportValues.date("31.03.2015")).isEqualTo(expected);
        assertThat(ImportValues.date("31.3.2015")).isEqualTo(expected);
        assertThat(ImportValues.date("31/03/2015")).isEqualTo(expected);
        assertThat(ImportValues.date("31.03.15")).isEqualTo(expected);
        assertThat(ImportValues.date("2015-03-31")).isEqualTo(expected);
        assertThat(ImportValues.date("2015-03-31 00:00:00")).isEqualTo(expected);
        assertThat(ImportValues.date("2015-03-31T00:00")).isEqualTo(expected);
        assertThat(ImportValues.date("")).isNull();
    }

    @Test
    void monthAndYear_theFirstOfTheMonth() {
        assertThat(ImportValues.date("03.2015")).isEqualTo(LocalDate.of(2015, 3, 1));
        assertThat(ImportValues.date("3/2015")).isEqualTo(LocalDate.of(2015, 3, 1));
    }

    @Test
    void twoDigitYear_notInTheFuture() {
        int next = (Year.now().getValue() + 1) % 100;
        assertThat(ImportValues.date("01.01.%02d".formatted(next)).getYear()).isEqualTo(Year.now().getValue() + 1 - 100);
        assertThat(ImportValues.date("01.01.85").getYear()).isEqualTo(1985);
    }

    @Test
    void noDate_saysSo() {
        assertThatThrownBy(() -> ImportValues.date("März 2015")).hasMessage("kein Datum");
        assertThatThrownBy(() -> ImportValues.date("31.02.2015")).hasMessage("kein gültiges Datum");
        assertThatThrownBy(() -> ImportValues.date("01.01.1850")).hasMessage("unplausibles Datum");
    }

    @Test
    void numbers_withThousandsAndUnit() {
        assertThat(ImportValues.integer("123456")).isEqualTo(123456);
        assertThat(ImportValues.integer("123'456 km")).isEqualTo(123456);
        assertThat(ImportValues.integer("123.456")).isEqualTo(123456);
        assertThat(ImportValues.integer("123 456")).isEqualTo(123456);
        assertThat(ImportValues.integer("123456.7")).isEqualTo(123456);
        assertThat(ImportValues.integer("")).isNull();
        assertThatThrownBy(() -> ImportValues.integer("viel")).hasMessage("keine Zahl");
    }

    @Test
    void modelYear_alsoOutOfADate() {
        assertThat(ImportValues.modelYear("2015")).isEqualTo(2015);
        assertThat(ImportValues.modelYear("01.06.2015")).isEqualTo(2015);
        assertThatThrownBy(() -> ImportValues.modelYear("15")).hasMessage("kein Jahrgang");
    }

    @Test
    void postalCodeAndCity_inOneColumn() {
        assertThat(ImportValues.splitPostalCodeCity("8400 Winterthur")).containsExactly("8400", "Winterthur");
        assertThat(ImportValues.splitPostalCodeCity("CH-8400  Winterthur ")).containsExactly("8400", "Winterthur");
        assertThat(ImportValues.splitPostalCodeCity("Winterthur")).containsExactly("", "Winterthur");
    }
}
