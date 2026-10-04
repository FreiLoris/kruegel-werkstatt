package ch.kruegel.workshop.common.config;

import ch.kruegel.workshop.common.person.CurrentPerson;
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
 * Turns on automatic filling of {@code createdAt}/{@code updatedAt} and
 * {@code createdBy}/{@code updatedBy} (see {@link ch.kruegel.workshop.common.persistence.BaseEntity}).
 *
 * <p>Timestamps come from the central {@link Clock} – so tests can control them.
 * The person comes from the device that sends the change ({@link CurrentPerson}).
 */
@Configuration(proxyBeanMethods = false)
@EnableJpaAuditing(dateTimeProviderRef = "auditingDateTimeProvider", auditorAwareRef = "auditingPerson")
public class JpaConfig {

    @Bean
    DateTimeProvider auditingDateTimeProvider(Clock clock) {
        return () -> Optional.of(Instant.now(clock));
    }

    /** Empty for changes outside a request (sample data at startup) and during initial setup. */
    @Bean
    AuditorAware<UUID> auditingPerson() {
        return CurrentPerson::id;
    }
}
