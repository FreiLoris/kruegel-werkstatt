package ch.kruegel.workshop.common.config;

import ch.kruegel.workshop.common.persistence.PreMigrationBackup;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationInfoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.util.concurrent.TimeUnit;

/**
 * Flyway migrates on startup. With
 * {@code BACKUP_BEFORE_MIGRATION_DIR} set, the database is backed up with pg_dump first – only when
 * a migration is pending ({@link PreMigrationBackup}). Not set (tests, local development): Flyway
 * just migrates.
 */
@Configuration(proxyBeanMethods = false)
public class MigrationConfig {

    /** pg_dump of a few MB takes seconds – this only stops a hanging one */
    private static final long DUMP_TIMEOUT_MINUTES = 10;

    @Bean
    FlywayMigrationStrategy migrationStrategy(@Value("${workshop.backup-before-migration-dir:}") String backupDir,
                                              @Value("${spring.datasource.url}") String url,
                                              @Value("${spring.datasource.username}") String user,
                                              @Value("${spring.datasource.password}") String password,
                                              Clock clock) {
        if (backupDir.isBlank()) {
            return Flyway::migrate;
        }
        PreMigrationBackup backup = new PreMigrationBackup(Path.of(backupDir), file -> pgDump(url, user, password, file), clock);
        return flyway -> {
            MigrationInfoService info = flyway.info();
            MigrationInfo[] pending = info.pending();
            MigrationInfo current = info.current();
            backup.before(current == null ? null : current.getVersion().getVersion(),
                    pending.length == 0 ? null : pending[pending.length - 1].getVersion().getVersion());
            flyway.migrate();
        };
    }

    /** pg_dump of the app's database ("custom" format, like the nightly backup – pg_restore can read it) */
    private static void pgDump(String jdbcUrl, String user, String password, Path file) throws IOException {
        // jdbc:postgresql://db:5432/werkstatt
        URI uri = URI.create(jdbcUrl.substring("jdbc:".length()));
        // its messages into a file – read from a pipe, a hanging pg_dump would never reach the timeout
        Path output = Files.createTempFile("pg_dump", ".log");
        ProcessBuilder builder = new ProcessBuilder("pg_dump", "--format=custom", "--file=" + file)
                .redirectErrorStream(true)
                .redirectOutput(output.toFile());
        builder.environment().put("PGHOST", uri.getHost());
        builder.environment().put("PGPORT", String.valueOf(uri.getPort() == -1 ? 5432 : uri.getPort()));
        builder.environment().put("PGDATABASE", uri.getPath().substring(1));
        builder.environment().put("PGUSER", user);
        builder.environment().put("PGPASSWORD", password);
        Process process = builder.start();
        try {
            if (!process.waitFor(DUMP_TIMEOUT_MINUTES, TimeUnit.MINUTES)) {
                process.destroyForcibly();
                throw new IOException("pg_dump did not finish within " + DUMP_TIMEOUT_MINUTES + " minutes");
            }
            if (process.exitValue() != 0) {
                throw new IOException("pg_dump exited with " + process.exitValue() + ": " + Files.readString(output, StandardCharsets.UTF_8).strip());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
            throw new IOException("pg_dump interrupted", e);
        } finally {
            Files.deleteIfExists(output);
        }
    }
}
