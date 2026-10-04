package ch.kruegel.workshop.serviceitem;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ServiceItemTest {

    @Test
    void removesSurroundingWhitespace() {
        assertThat(new ServiceItem("  Ölwechsel ", 0).getName()).isEqualTo("Ölwechsel");
    }

    @Test
    void rejectsEmptyOrTooLongName() {
        assertThatThrownBy(() -> new ServiceItem("   ", 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ServiceItem("x".repeat(41), 0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void newItemIsOffered() {
        assertThat(new ServiceItem("Ölwechsel", 0).isActive()).isTrue();
    }
}
