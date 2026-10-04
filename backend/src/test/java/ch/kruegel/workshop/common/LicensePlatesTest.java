package ch.kruegel.workshop.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LicensePlatesTest {

    @Test
    void upperCaseAndSingleSpaces() {
        assertThat(LicensePlates.normalize("  zh   123456 ")).isEqualTo("ZH 123456");
    }

    @Test
    void emptyBecomesNull() {
        assertThat(LicensePlates.normalize("   ")).isNull();
        assertThat(LicensePlates.normalize(null)).isNull();
    }
}
