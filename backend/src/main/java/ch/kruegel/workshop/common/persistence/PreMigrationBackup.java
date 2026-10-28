package ch.kruegel.workshop.common.persistence;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * A backup of the database right before Flyway changes it – an update with a migration can be
 * undone with the state just before, not only with last night's. Only when something is to be
 * migrated and there is data already (a fresh database has nothing to lose).
 *
 * <p>No backup, no migration: a backup that cannot be written stops the start (the app stays on
 * the old schema – nothing is lost), the log says why. The folder is prepared by the backup
 * container ({@code backup/entrypoint.sh}); the latest {@link #KEEP} are kept.
 */
public class PreMigrationBackup {

    /** How many backups before an update are kept – updates with a migration are rare */
    static final int KEEP = 10;

    private static final Logger log = LoggerFactory.getLogger(PreMigrationBackup.class);
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmm");
    private static final String PREFIX = "werkstatt_";
    private static final String SUFFIX = ".dump";

    /** Writes the whole database into a file – pg_dump in production, a fake in tests */
    @FunctionalInterface
    public interface DatabaseDump {
        void to(Path file) throws IOException;
    }

    private final Path dir;
    private final DatabaseDump dump;
    private final Clock clock;

    public PreMigrationBackup(Path dir, DatabaseDump dump, Clock clock) {
        this.dir = dir;
        this.dump = dump;
        this.clock = clock;
    }

    /**
     * @param currentVersion the schema version now; empty = a fresh database
     * @param targetVersion  the version after the migration; empty = nothing to migrate
     * @return the backup written – empty when there was nothing to save
     */
    public Optional<Path> before(String currentVersion, String targetVersion) {
        if (currentVersion == null || targetVersion == null) {
            return Optional.empty();
        }
        if (!Files.isDirectory(dir) || !Files.isWritable(dir)) {
            throw new IllegalStateException("Backup before migrating to V" + targetVersion + ": folder " + dir
                    + " missing or not writable – the backup container prepares it; to start without, remove BACKUP_BEFORE_MIGRATION_DIR");
        }
        String name = PREFIX + STAMP.format(LocalDateTime.now(clock)) + "_vor-V" + targetVersion + SUFFIX;
        // a temporary name first – a half-written file must never look like a backup
        Path partial = dir.resolve("." + name + ".partial");
        Path file = dir.resolve(name);
        try {
            dump.to(partial);
            Files.move(partial, file, StandardCopyOption.REPLACE_EXISTING);
            log.info("Backup before migrating V{} → V{}: {} ({} bytes)", currentVersion, targetVersion, file, Files.size(file));
            prune();
            return Optional.of(file);
        } catch (IOException e) {
            throw new UncheckedIOException("Backup before migrating to V" + targetVersion + " failed – not migrated", e);
        } finally {
            try {
                Files.deleteIfExists(partial);
            } catch (IOException e) {
                log.warn("Could not delete {}", partial, e);
            }
        }
    }

    /** The latest {@link #KEEP} stay – by name, which starts with the time */
    private void prune() throws IOException {
        List<Path> backups;
        try (Stream<Path> files = Files.list(dir)) {
            backups = files.filter(p -> p.getFileName().toString().startsWith(PREFIX) && p.getFileName().toString().endsWith(SUFFIX))
                    .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed())
                    .toList();
        }
        for (Path old : backups.subList(Math.min(KEEP, backups.size()), backups.size())) {
            Files.delete(old);
            log.info("Old backup before an update deleted: {}", old.getFileName());
        }
    }
}
