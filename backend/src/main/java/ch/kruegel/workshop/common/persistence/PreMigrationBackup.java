package ch.kruegel.workshop.common.persistence;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationInfoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.time.LocalDate;
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
 * container ({@code backup/entrypoint.sh}); the latest {@link #KEEP} are kept. A migration that
 * fails makes Docker restart the backend – the backup of the day for that version is not made again,
 * so the restarts do not push older backups out.
 */
public class PreMigrationBackup {

    /** How many backups before an update are kept – updates with a migration are rare */
    static final int KEEP = 10;

    private static final Logger log = LoggerFactory.getLogger(PreMigrationBackup.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmm");
    private static final String PREFIX = "werkstatt_";
    private static final String SUFFIX = ".dump";

    /** Writes the whole database into a file – {@link PgDump} in production, a fake in tests */
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

    /** The migration strategy: backed up first if anything is pending on existing data, then migrated */
    public void migrate(Flyway flyway) {
        MigrationInfoService info = flyway.info();
        MigrationInfo[] pending = info.pending();
        MigrationInfo current = info.current();
        if (pending.length > 0 && current != null) {
            before(current.getVersion().getVersion(), pending[pending.length - 1].getVersion().getVersion());
        }
        flyway.migrate();
    }

    /**
     * @param currentVersion the schema version now
     * @param targetVersion  the version after the migration
     * @return the backup written – empty when today's for that version is there already
     */
    Optional<Path> before(String currentVersion, String targetVersion) {
        if (!Files.isDirectory(dir) || !Files.isWritable(dir)) {
            throw new IllegalStateException("Backup before migrating to V" + targetVersion + ": folder " + dir
                    + " missing or not writable – the backup container prepares it; to start without, remove BACKUP_BEFORE_MIGRATION_DIR");
        }
        String suffix = "_vor-V" + targetVersion + SUFFIX;
        String today = PREFIX + DAY.format(LocalDate.now(clock));
        Optional<Path> done = backups().stream().filter(p -> name(p).startsWith(today) && name(p).endsWith(suffix)).findFirst();
        if (done.isPresent()) {
            log.info("Backup before migrating to V{} made today already: {}", targetVersion, done.get().getFileName());
            return Optional.empty();
        }
        String name = PREFIX + STAMP.format(LocalDateTime.now(clock)) + suffix;
        // a temporary name first – a half-written file must never look like a backup
        Path partial = dir.resolve("." + name + ".partial");
        Path file = dir.resolve(name);
        try {
            dump.to(partial);
            Files.move(partial, file, StandardCopyOption.REPLACE_EXISTING);
            log.info("Backup before migrating V{} → V{}: {} ({} bytes)", currentVersion, targetVersion, file, Files.size(file));
        } catch (IOException e) {
            throw new UncheckedIOException("Backup before migrating to V" + targetVersion + " failed – not migrated", e);
        } finally {
            try {
                Files.deleteIfExists(partial);
            } catch (IOException e) {
                log.warn("Could not delete {}", partial, e);
            }
        }
        prune();
        return Optional.of(file);
    }

    /**
     * The latest {@link #KEEP} stay – by name, which starts with the time. Housekeeping only: a file
     * that cannot be deleted (e.g. copied in by someone else) never stops the migration.
     */
    private void prune() {
        List<Path> backups = backups();
        for (Path old : backups.subList(Math.min(KEEP, backups.size()), backups.size())) {
            try {
                Files.delete(old);
                log.info("Old backup before an update deleted: {}", old.getFileName());
            } catch (IOException e) {
                log.warn("Old backup before an update could not be deleted: {}", old.getFileName(), e);
            }
        }
    }

    /** Newest first */
    private List<Path> backups() {
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(p -> name(p).startsWith(PREFIX) && name(p).endsWith(SUFFIX))
                    .sorted(Comparator.comparing(PreMigrationBackup::name).reversed())
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("Backup folder " + dir + " cannot be read", e);
        }
    }

    private static String name(Path path) {
        return path.getFileName().toString();
    }
}
