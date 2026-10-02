package ch.kruegel.werkstatt.common.persistence;

import ch.kruegel.werkstatt.TestcontainersConfiguration;
import ch.kruegel.werkstatt.common.TestClock;
import ch.kruegel.werkstatt.common.config.JpaConfig;
import jakarta.persistence.EntityManager;
import jakarta.persistence.OptimisticLockException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Prüft das gemeinsame Verhalten aller Entitäten: ID, Zeitstempel, Optimistic Locking.
 *
 * <p>{@code @DataJpaTest} startet nur den Datenbank-Teil der Anwendung (schneller als die
 * ganze App) und rollt nach jedem Test alle Änderungen zurück.
 */
@DataJpaTest
@Import({TestcontainersConfiguration.class, JpaConfig.class, BaseEntityTest.UhrConfig.class})
class BaseEntityTest {

    private static final Instant START = Instant.parse("2026-10-01T06:00:00Z");

    @TestConfiguration
    static class UhrConfig {
        @Bean
        TestClock clock() {
            return new TestClock(START);
        }
    }

    @Autowired
    private EntityManager em;

    @Autowired
    private TestClock uhr;

    // Die Uhr ist für alle Tests dieselbe Instanz → vor jedem Test zurückstellen,
    // sonst hängt das Ergebnis davon ab, welcher Test vorher gelaufen ist.
    @BeforeEach
    void uhrZuruecksetzen() {
        uhr.stellen(START);
    }

    @Test
    void vergibtBeimSpeichernEineUuidVersion7() {
        TestEntity entity = new TestEntity("Test");
        assertThat(entity.getId()).isNull();

        em.persist(entity);

        assertThat(entity.getId()).isNotNull();
        assertThat(entity.getId().version()).isEqualTo(7);
    }

    @Test
    void setztErstelltUndGeaendertBeimSpeichern() {
        TestEntity entity = new TestEntity("Test");

        em.persist(entity);
        em.flush();

        assertThat(entity.getErstelltAm()).isEqualTo(START);
        assertThat(entity.getGeaendertAm()).isEqualTo(START);
    }

    @Test
    void aktualisiertNurGeaendertAmBeiAenderung() {
        TestEntity entity = new TestEntity("Vorher");
        em.persist(entity);
        em.flush();

        uhr.vorspulen(Duration.ofHours(2));
        entity.setName("Nachher");
        em.flush();

        assertThat(entity.getErstelltAm()).isEqualTo(START);
        assertThat(entity.getGeaendertAm()).isEqualTo(START.plus(Duration.ofHours(2)));
        assertThat(entity.getVersion()).isEqualTo(1);
    }

    @Test
    void verhindertUeberschreibenMitVeralteterVersion() {
        TestEntity entity = new TestEntity("Original");
        em.persist(entity);
        em.flush();
        em.clear();

        // Gerät A hat den Datensatz geladen ...
        TestEntity geraetA = em.find(TestEntity.class, entity.getId());
        em.detach(geraetA);

        // ... währenddessen speichert Gerät B eine Änderung.
        TestEntity geraetB = em.find(TestEntity.class, entity.getId());
        geraetB.setName("Änderung von B");
        em.flush();

        // Jetzt will Gerät A mit seinem veralteten Stand speichern → muss scheitern.
        geraetA.setName("Änderung von A");
        assertThatThrownBy(() -> {
            em.merge(geraetA);
            em.flush();
        }).isInstanceOf(OptimisticLockException.class);
    }

    @Test
    void pruefeVersionAkzeptiertAktuelleUndLehntVeralteteAb() {
        TestEntity entity = new TestEntity("Test");
        em.persist(entity);
        em.flush();
        entity.setName("geändert");
        em.flush(); // jetzt Version 1

        entity.pruefeVersion(1); // aktueller Stand → ok

        assertThatThrownBy(() -> entity.pruefeVersion(0))
                .isInstanceOf(VeralteteVersionException.class);
    }

    @Test
    void entitaetenMitGleicherIdSindGleich() {
        TestEntity entity = new TestEntity("Test");
        em.persist(entity);
        em.flush();
        em.clear();

        TestEntity neuGeladen = em.find(TestEntity.class, entity.getId());

        assertThat(neuGeladen).isEqualTo(entity).isNotSameAs(entity);
        assertThat(new TestEntity("A")).isNotEqualTo(new TestEntity("A"));
    }
}
