package ch.kruegel.werkstatt.common.config;

import ch.kruegel.werkstatt.common.person.AktuellePerson;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Schaltet das automatische Setzen von {@code erstelltAm}/{@code geaendertAm} und
 * {@code erstelltVon}/{@code geaendertVon} ein (siehe {@link ch.kruegel.werkstatt.common.persistence.BaseEntity}).
 *
 * <p>Die Zeitstempel kommen aus der zentralen {@link Clock} – so sind sie in Tests steuerbar.
 * Die Person kommt vom Gerät, das die Änderung schickt ({@link AktuellePerson}).
 */
@Configuration(proxyBeanMethods = false)
@EnableJpaAuditing(dateTimeProviderRef = "auditingDateTimeProvider", auditorAwareRef = "auditingPerson")
public class JpaConfig {

    @Bean
    DateTimeProvider auditingDateTimeProvider(Clock clock) {
        return () -> Optional.of(Instant.now(clock));
    }

    /** Leer bei Änderungen ohne Anfrage (Testdaten beim Start) und bei der Ersteinrichtung. */
    @Bean
    AuditorAware<UUID> auditingPerson() {
        return AktuellePerson::id;
    }
}
