package ch.kruegel.workshop.common.config;

import ch.kruegel.workshop.common.persistence.PgDump;
import ch.kruegel.workshop.common.persistence.PreMigrationBackup;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.time.Clock;

/**
 * Flyway migrates on startup. With {@code BACKUP_BEFORE_MIGRATION_DIR} set, the database is backed up
 * with pg_dump first – only when a migration is pending ({@link PreMigrationBackup#migrate}). Not
 * set (tests, local development): Flyway just migrates.
 */
@Configuration(proxyBeanMethods = false)
public class MigrationConfig {

    @Bean
    FlywayMigrationStrategy migrationStrategy(@Value("${workshop.backup-before-migration-dir:}") String backupDir,
                                              @Value("${spring.datasource.url}") String url,
                                              @Value("${spring.datasource.username}") String user,
                                              @Value("${spring.datasource.password}") String password,
                                              Clock clock) {
        if (backupDir.isBlank()) {
            return Flyway::migrate;
        }
        return new PreMigrationBackup(Path.of(backupDir), new PgDump(url, user, password), clock)::migrate;
    }
}
