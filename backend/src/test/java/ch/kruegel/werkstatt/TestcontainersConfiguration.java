package ch.kruegel.werkstatt;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Startet für die Tests ein echtes PostgreSQL in Docker.
 *
 * <p>{@code @ServiceConnection} sorgt dafür, dass Spring die Verbindungsdaten
 * (URL, Benutzer, Passwort) automatisch vom Container übernimmt –
 * die Werte aus application.yaml werden in Tests also nicht verwendet.
 *
 * <p>Gleiche Image-Version wie in compose.yaml, damit Tests und Betrieb übereinstimmen.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer("postgres:18-alpine");
    }
}
