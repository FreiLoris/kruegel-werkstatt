package ch.kruegel.workshop.common;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class LicensePlatesTest {

    @ParameterizedTest
    @ValueSource(strings = {"SG 197052", "sg197052", "SG-197052", "SG·197 052", "  sg   197'052 ", "SG.197052"})
    void swissPlatesGetOneForm(String typed) {
        assertThat(LicensePlates.normalize(typed)).isEqualTo("SG 197052");
    }

    @Test
    void graubuendenWithDigitsIsSwiss() {
        assertThat(LicensePlates.normalize("gr12345")).isEqualTo("GR 12345");
    }

    @Test
    void foreignPlatesOnlyUpperCaseAndSingleSpaces() {
        assertThat(LicensePlates.normalize("  d   m-ab 1234 ")).isEqualTo("D M-AB 1234");
        // "GR" with letters is Greece, not Graubünden
        assertThat(LicensePlates.normalize("GR ABC-1234")).isEqualTo("GR ABC-1234");
    }

    @Test
    void notACantonCodeStaysAsTyped() {
        assertThat(LicensePlates.normalize("xx123")).isEqualTo("XX123");
    }

    @Test
    void moreThanSixDigitsIsNoSwissPlate() {
        assertThat(LicensePlates.normalize("ZH1234567")).isEqualTo("ZH1234567");
    }

    @Test
    void emptyBecomesNull() {
        assertThat(LicensePlates.normalize("   ")).isNull();
        assertThat(LicensePlates.normalize(null)).isNull();
    }
}
