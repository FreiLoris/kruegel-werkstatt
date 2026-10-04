package ch.kruegel.workshop.common.persistence;

import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.TestClock;
import ch.kruegel.workshop.common.config.JpaConfig;
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
 * Checks the behaviour shared by all entities: ID, timestamps, optimistic locking.
 *
 * <p>{@code @DataJpaTest} only starts the database part of the application (faster than the
 * whole app) and rolls back all changes after each test.
 */
@DataJpaTest
@Import({TestcontainersConfiguration.class, JpaConfig.class, BaseEntityTest.ClockConfig.class})
class BaseEntityTest {

    private static final Instant START = Instant.parse("2026-10-01T06:00:00Z");

    @TestConfiguration
    static class ClockConfig {
        @Bean
        TestClock clock() {
            return new TestClock(START);
        }
    }

    @Autowired
    private EntityManager em;

    @Autowired
    private TestClock clock;

    // The clock is the same instance for all tests → reset it before each test,
    // otherwise the result depends on which test ran before.
    @BeforeEach
    void resetClock() {
        clock.set(START);
    }

    @Test
    void assignsUuidVersion7OnSave() {
        TestEntity entity = new TestEntity("Test");
        assertThat(entity.getId()).isNull();

        em.persist(entity);

        assertThat(entity.getId()).isNotNull();
        assertThat(entity.getId().version()).isEqualTo(7);
    }

    @Test
    void setsCreatedAndUpdatedOnSave() {
        TestEntity entity = new TestEntity("Test");

        em.persist(entity);
        em.flush();

        assertThat(entity.getCreatedAt()).isEqualTo(START);
        assertThat(entity.getUpdatedAt()).isEqualTo(START);
    }

    @Test
    void onlyUpdatesUpdatedAtOnChange() {
        TestEntity entity = new TestEntity("Before");
        em.persist(entity);
        em.flush();

        clock.advance(Duration.ofHours(2));
        entity.setName("After");
        em.flush();

        assertThat(entity.getCreatedAt()).isEqualTo(START);
        assertThat(entity.getUpdatedAt()).isEqualTo(START.plus(Duration.ofHours(2)));
        assertThat(entity.getVersion()).isEqualTo(1);
    }

    @Test
    void preventsOverwritingWithStaleVersion() {
        TestEntity entity = new TestEntity("Original");
        em.persist(entity);
        em.flush();
        em.clear();

        // Device A has loaded the record ...
        TestEntity deviceA = em.find(TestEntity.class, entity.getId());
        em.detach(deviceA);

        // ... meanwhile device B saves a change.
        TestEntity deviceB = em.find(TestEntity.class, entity.getId());
        deviceB.setName("Change from B");
        em.flush();

        // Now device A wants to save its stale state → must fail.
        deviceA.setName("Change from A");
        assertThatThrownBy(() -> {
            em.merge(deviceA);
            em.flush();
        }).isInstanceOf(OptimisticLockException.class);
    }

    @Test
    void checkVersionAcceptsCurrentAndRejectsStale() {
        TestEntity entity = new TestEntity("Test");
        em.persist(entity);
        em.flush();
        entity.setName("changed");
        em.flush(); // now version 1

        entity.checkVersion(1); // current state → ok

        assertThatThrownBy(() -> entity.checkVersion(0))
                .isInstanceOf(StaleVersionException.class);
    }

    @Test
    void entitiesWithSameIdAreEqual() {
        TestEntity entity = new TestEntity("Test");
        em.persist(entity);
        em.flush();
        em.clear();

        TestEntity reloaded = em.find(TestEntity.class, entity.getId());

        assertThat(reloaded).isEqualTo(entity).isNotSameAs(entity);
        assertThat(new TestEntity("A")).isNotEqualTo(new TestEntity("A"));
    }
}
