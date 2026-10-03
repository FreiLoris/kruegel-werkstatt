package ch.kruegel.werkstatt.lift;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LiftTest {

    @Test
    void entferntLeerzeichenAmRand() {
        assertThat(new Lift("  Lift 4 ", 0).getName()).isEqualTo("Lift 4");
    }

    @Test
    void lehntLeerenOderZuLangenNamenAb() {
        assertThatThrownBy(() -> new Lift("   ", 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Lift("x".repeat(31), 0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void neuerLiftIstInBetrieb() {
        assertThat(new Lift("Lift 1", 0).isAktiv()).isTrue();
    }
}
