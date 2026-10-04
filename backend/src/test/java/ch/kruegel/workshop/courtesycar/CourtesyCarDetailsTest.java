package ch.kruegel.workshop.courtesycar;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Plain unit test – no Spring, no database. */
class CourtesyCarDetailsTest {

    @Test
    void normalizesLicensePlate() {
        CourtesyCarDetails details = new CourtesyCarDetails("Ersatzwagen 1", "VW Polo", "  zh   10001 ", null, null);

        assertThat(details.licensePlate()).isEqualTo("ZH 10001");
    }

    @Test
    void emptyOptionalTextsBecomeNull() {
        CourtesyCarDetails details = new CourtesyCarDetails(" Ersatzwagen 1 ", "  ", "", null, null);

        assertThat(details.name()).isEqualTo("Ersatzwagen 1");
        assertThat(details.model()).isNull();
        assertThat(details.licensePlate()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "Ein sehr langer Name für ein Auto mit über vierzig Zeichen"})
    void rejectsInvalidName(String name) {
        assertThatThrownBy(() -> new CourtesyCarDetails(name, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsTooLongLicensePlate() {
        assertThatThrownBy(() -> new CourtesyCarDetails("Ersatzwagen 1", null, "ZH 1234567890123", null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
