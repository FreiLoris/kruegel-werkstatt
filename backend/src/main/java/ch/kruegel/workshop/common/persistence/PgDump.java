package ch.kruegel.workshop.common.persistence;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/**
 * pg_dump of the app's database – "custom" format like the nightly backup, so restore.sh /
 * pg_restore can read it. The password goes to pg_dump in its environment, never on the command line.
 */
public class PgDump implements PreMigrationBackup.DatabaseDump {

    /** pg_dump of a few MB takes seconds – this only stops a hanging one */
    private static final long TIMEOUT_MINUTES = 10;

    private final String host;
    private final int port;
    private final String database;
    private final String user;
    private final String password;

    /** @param jdbcUrl like {@code jdbc:postgresql://db:5432/werkstatt} – the only form the app uses */
    public PgDump(String jdbcUrl, String user, String password) {
        URI uri = URI.create(jdbcUrl.substring(jdbcUrl.indexOf(':') + 1));
        if (uri.getHost() == null || uri.getPath() == null || uri.getPath().length() < 2) {
            throw new IllegalArgumentException("Backup before migrating needs a URL like jdbc:postgresql://host:port/db, not " + jdbcUrl);
        }
        this.host = uri.getHost();
        this.port = uri.getPort() == -1 ? 5432 : uri.getPort();
        this.database = uri.getPath().substring(1);
        this.user = user;
        this.password = password;
    }

    @Override
    public void to(Path file) throws IOException {
        // its messages into a file – read from a pipe, a hanging pg_dump would never reach the timeout
        Path output = Files.createTempFile("pg_dump", ".log");
        try {
            ProcessBuilder builder = new ProcessBuilder("pg_dump", "--format=custom", "--file=" + file)
                    .redirectErrorStream(true)
                    .redirectOutput(output.toFile());
            builder.environment().put("PGHOST", host);
            builder.environment().put("PGPORT", String.valueOf(port));
            builder.environment().put("PGDATABASE", database);
            builder.environment().put("PGUSER", user);
            builder.environment().put("PGPASSWORD", password);
            Process process = builder.start();
            try {
                if (!process.waitFor(TIMEOUT_MINUTES, TimeUnit.MINUTES)) {
                    stop(process);
                    throw new IOException("pg_dump did not finish within " + TIMEOUT_MINUTES + " minutes");
                }
                if (process.exitValue() != 0) {
                    throw new IOException("pg_dump exited with " + process.exitValue() + ": " + Files.readString(output, StandardCharsets.UTF_8).strip());
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                stop(process);
                throw new IOException("pg_dump interrupted", e);
            }
        } finally {
            Files.deleteIfExists(output);
        }
    }

    /** Gone before its half file is deleted */
    private static void stop(Process process) throws IOException {
        process.destroyForcibly();
        try {
            process.waitFor(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("pg_dump interrupted while stopping", e);
        }
    }
}
