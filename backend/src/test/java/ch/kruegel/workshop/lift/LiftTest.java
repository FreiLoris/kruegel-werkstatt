package ch.kruegel.workshop.lift;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LiftTest {

    @Test
    void removesSurroundingWhitespace() {
        assertThat(new Lift("  Lift 4 ", 0).getName()).isEqualTo("Lift 4");
    }

    @Test
    void rejectsEmptyOrTooLongName() {
        assertThatThrownBy(() -> new Lift("   ", 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Lift("x".repeat(31), 0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void newLiftIsInService() {
        assertThat(new Lift("Lift 1", 0).isActive()).isTrue();
    }
}
