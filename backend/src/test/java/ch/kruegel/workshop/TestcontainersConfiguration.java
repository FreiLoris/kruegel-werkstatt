package ch.kruegel.workshop;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Starts a real PostgreSQL in Docker for the tests.
 *
 * <p>{@code @ServiceConnection} makes Spring take the connection details
 * (URL, user, password) from the container automatically –
 * the values from application.yaml are therefore not used in tests.
 *
 * <p>Same image version as in compose.yaml, so tests and production match.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer("postgres:18-alpine");
    }
}
