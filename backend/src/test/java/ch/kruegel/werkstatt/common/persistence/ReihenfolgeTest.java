package ch.kruegel.werkstatt.common.persistence;

import ch.kruegel.werkstatt.common.web.EingabeFehlerException;
import ch.kruegel.werkstatt.common.web.NichtGefundenException;
import org.junit.jupiter.api.Test;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReihenfolgeTest {

    /** Minimaler Eintrag nur für diesen Test */
    static final class Eintrag implements Sortierbar {
        final UUID id = UUID.randomUUID();
        final String name;
        int position;

        Eintrag(String name, int position) {
            this.name = name;
            this.position = position;
        }

        @Override
        public UUID getId() {
            return id;
        }

        @Override
        public void verschieben(int neueReihenfolge) {
            position = neueReihenfolge;
        }
    }

    private final Eintrag a = new Eintrag("A", 0);
    private final Eintrag b = new Eintrag("B", 1);
    private final Eintrag c = new Eintrag("C", 5); // Lücke wird geschlossen
    private final List<Eintrag> bisher = List.of(a, b, c);

    @Test
    void genannteNachVorneRestDahinterLueckenlos() {
        Reihenfolge.neuSetzen(bisher, List.of(c.id, a.id), "Eintrag");

        assertThat(sortiert()).containsExactly("C", "A", "B");
        assertThat(c.position).isZero();
        assertThat(b.position).isEqualTo(2);
    }

    @Test
    void doppelteIdIstEingabefehler() {
        assertThatThrownBy(() -> Reihenfolge.neuSetzen(bisher, List.of(a.id, a.id), "Eintrag"))
                .isInstanceOf(EingabeFehlerException.class);
    }

    @Test
    void unbekannteIdWirdGemeldet() {
        assertThatThrownBy(() -> Reihenfolge.neuSetzen(bisher, List.of(UUID.randomUUID()), "Eintrag"))
                .isInstanceOf(NichtGefundenException.class);
    }

    private List<String> sortiert() {
        return bisher.stream().sorted(Comparator.comparingInt(e -> e.position)).map(e -> e.name).toList();
    }
}
