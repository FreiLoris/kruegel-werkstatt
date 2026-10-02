package ch.kruegel.werkstatt.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

/**
 * Schaltet das automatische Setzen von {@code erstelltAm}/{@code geaendertAm} ein
 * (siehe {@link ch.kruegel.werkstatt.common.persistence.BaseEntity}).
 *
 * <p>Die Zeitstempel kommen aus der zentralen {@link Clock} – so sind sie in Tests steuerbar.
 */
@Configuration(proxyBeanMethods = false)
@EnableJpaAuditing(dateTimeProviderRef = "auditingDateTimeProvider")
public class JpaConfig {

    @Bean
    DateTimeProvider auditingDateTimeProvider(Clock clock) {
        return () -> Optional.of(Instant.now(clock));
    }
}
