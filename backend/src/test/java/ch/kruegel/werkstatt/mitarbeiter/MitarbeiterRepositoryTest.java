package ch.kruegel.werkstatt.mitarbeiter;

import ch.kruegel.werkstatt.TestcontainersConfiguration;
import ch.kruegel.werkstatt.common.config.JpaConfig;
import ch.kruegel.werkstatt.common.config.TimeConfig;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.util.List;

import static ch.kruegel.werkstatt.mitarbeiter.MitarbeiterTestdaten.mitarbeiter;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import({TestcontainersConfiguration.class, JpaConfig.class, TimeConfig.class})
class MitarbeiterRepositoryTest {

    @Autowired
    private MitarbeiterRepository repository;

    @Autowired
    private EntityManager em;

    @Test
    void speichertUndLaedtAlleAngaben() {
        MitarbeiterStammdaten daten = new MitarbeiterStammdaten("Reto", Rolle.GESCHAEFTSFUEHRUNG, "#f6d860",
                LocalDate.of(1985, 3, 12), 25, false, true, false);
        Mitarbeiter gespeichert = repository.saveAndFlush(new Mitarbeiter(daten, 0));
        em.clear();

        Mitarbeiter geladen = repository.findById(gespeichert.getId()).orElseThrow();

        assertThat(geladen.getStammdaten()).isEqualTo(daten);
        assertThat(geladen.isAktiv()).isTrue();
    }

    @Test
    void sortiertNachReihenfolgeUndBeiGleichstandNachName() {
        repository.saveAll(List.of(
                mitarbeiter("Noser", 2), mitarbeiter("Erich", 1), mitarbeiter("Döme", 1), mitarbeiter("Reto", 0)));

        assertThat(repository.findAllByOrderByReihenfolgeAscNameAsc())
                .extracting(Mitarbeiter::getName)
                .containsExactly("Reto", "Döme", "Erich", "Noser");
    }

    @Test
    void auswahlEnthaeltNurAktive() {
        Mitarbeiter ehemalig = mitarbeiter("Ehemalig", 0);
        ehemalig.deaktivieren();
        repository.saveAll(List.of(ehemalig, mitarbeiter("Aktiv", 1)));

        assertThat(repository.findByAktivTrueOrderByReihenfolgeAscNameAsc())
                .extracting(Mitarbeiter::getName)
                .containsExactly("Aktiv");
    }

    @Test
    void zweiAktiveMitGleichemNamenSindNichtErlaubt() {
        repository.saveAndFlush(mitarbeiter("Reto", 0));

        // Gross-/Kleinschreibung und Leerzeichen spielen keine Rolle
        assertThatThrownBy(() -> repository.saveAndFlush(mitarbeiter(" reto ", 1)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void ehemaligerBlockiertDenNamenNicht() {
        Mitarbeiter ehemalig = mitarbeiter("Reto", 0);
        ehemalig.deaktivieren();
        repository.saveAndFlush(ehemalig);

        repository.saveAndFlush(mitarbeiter("Reto", 1));

        assertThat(repository.count()).isEqualTo(2);
    }

    @Test
    void naechsteReihenfolgeKommtAnsEnde() {
        assertThat(repository.naechsteReihenfolge()).isZero();

        repository.saveAndFlush(mitarbeiter("Reto", 0));
        repository.saveAndFlush(mitarbeiter("Erich", 5));

        assertThat(repository.naechsteReihenfolge()).isEqualTo(6);
    }

    @Test
    void datenbankLehntUngueltigeFarbeAbAuchOhneJava() {
        // Zweite Verteidigungslinie: Selbst wer an Java vorbei direkt in die DB schreibt
        // (z. B. ein Migrationsskript), kann keine ungültigen Werte speichern.
        assertThatThrownBy(() -> em.createNativeQuery("""
                        INSERT INTO mitarbeiter (id, version, erstellt_am, geaendert_am, name, rolle, farbe,
                            ferienanspruch, als_mechaniker_waehlbar, fuer_aufgaben_waehlbar, pinnwand_spalte,
                            aktiv, reihenfolge)
                        VALUES (gen_random_uuid(), 0, now(), now(), 'Test', 'MECHANIKER', 'rot',
                            25, true, true, true, true, 0)
                        """).executeUpdate())
                .hasMessageContaining("farbe");
    }
}
