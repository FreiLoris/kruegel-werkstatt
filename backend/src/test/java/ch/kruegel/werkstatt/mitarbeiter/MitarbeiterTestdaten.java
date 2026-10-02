package ch.kruegel.werkstatt.mitarbeiter;

import java.time.LocalDate;

/** Hilfen zum Erstellen von Testdaten – Tests sollen nur angeben, was für sie wichtig ist. */
public final class MitarbeiterTestdaten {

    private MitarbeiterTestdaten() {
    }

    public static MitarbeiterStammdaten stammdaten(String name) {
        return new MitarbeiterStammdaten(name, Rolle.MECHANIKER, "#9fc8f0", LocalDate.of(1990, 5, 18),
                25, true, true, true);
    }

    public static Mitarbeiter mitarbeiter(String name, int reihenfolge) {
        return new Mitarbeiter(stammdaten(name), reihenfolge);
    }
}
