package ch.kruegel.werkstatt.mitarbeiter;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Reiner Unit-Test – ohne Spring, ohne Datenbank, darum sehr schnell. */
class MitarbeiterStammdatenTest {

    private static MitarbeiterStammdaten mit(String name, String farbe, int ferienanspruch) {
        return new MitarbeiterStammdaten(name, Rolle.MECHANIKER, farbe, null, ferienanspruch, true, true, true);
    }

    @Test
    void bereinigtNameUndFarbe() {
        MitarbeiterStammdaten daten = mit("  Döme ", " #9FDFAA ", 20);

        assertThat(daten.name()).isEqualTo("Döme");
        assertThat(daten.farbe()).isEqualTo("#9fdfaa");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "Ein sehr langer Name mit mehr als vierzig Zeichen"})
    void lehntUngueltigenNamenAb(String name) {
        assertThatThrownBy(() -> mit(name, "#9fdfaa", 20)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"rot", "#fff", "#12345g", "9fdfaa"})
    void lehntUngueltigeFarbeAb(String farbe) {
        assertThatThrownBy(() -> mit("Reto", farbe, 20)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 61})
    void lehntUnplausiblenFerienanspruchAb(int tage) {
        assertThatThrownBy(() -> mit("Reto", "#9fdfaa", tage)).isInstanceOf(IllegalArgumentException.class);
    }
}
