package ch.kruegel.werkstatt.serviceleistung;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ServiceleistungTest {

    @Test
    void entferntLeerzeichenAmRand() {
        assertThat(new Serviceleistung("  Ölwechsel ", 0).getName()).isEqualTo("Ölwechsel");
    }

    @Test
    void lehntLeerenOderZuLangenNamenAb() {
        assertThatThrownBy(() -> new Serviceleistung("   ", 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Serviceleistung("x".repeat(41), 0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void neueLeistungWirdAngeboten() {
        assertThat(new Serviceleistung("Ölwechsel", 0).isAktiv()).isTrue();
    }
}
