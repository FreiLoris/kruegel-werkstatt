package ch.kruegel.workshop.common.persistence;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationInfoService;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InOrder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PreMigrationBackupTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-28T17:30:00Z"), ZoneId.of("Europe/Zurich"));

    @TempDir
    Path dir;

    private final List<String> dumped = new ArrayList<>();

    private PreMigrationBackup backup(Path folder) {
        return new PreMigrationBackup(folder, file -> {
            dumped.add(file.getFileName().toString());
            Files.writeString(file, "dump");
        }, CLOCK);
    }

    @Test
    void backsUpBeforeMigratingUnderANameWithTimeAndTarget() throws IOException {
        Flyway flyway = flyway("51", "52");

        backup(dir).migrate(flyway);

        assertThat(files()).containsExactly("werkstatt_2026-10-28_1830_vor-V52.dump");
        assertThat(dir.resolve("werkstatt_2026-10-28_1830_vor-V52.dump")).hasContent("dump");
        // first the backup, then the migration
        InOrder order = inOrder(flyway);
        order.verify(flyway).info();
        order.verify(flyway).migrate();
    }

    @Test
    void nothingToSaveOnAFreshDatabaseOrWithoutMigration() throws IOException {
        Flyway fresh = flyway(null, "52");
        Flyway upToDate = flyway("52", null);

        backup(dir).migrate(fresh);
        backup(dir).migrate(upToDate);

        assertThat(files()).isEmpty();
        verify(fresh).migrate();
        verify(upToDate).migrate();
    }

    @Test
    void aFailedDumpStopsTheMigrationAndLeavesNoFile() throws IOException {
        Flyway flyway = flyway("51", "52");
        PreMigrationBackup failing = new PreMigrationBackup(dir, file -> {
            Files.writeString(file, "half");
            throw new IOException("pg_dump exited with 1");
        }, CLOCK);

        assertThatThrownBy(() -> failing.migrate(flyway)).hasMessageContaining("not migrated");
        assertThat(files()).isEmpty();
        verify(flyway, never()).migrate();
    }

    @Test
    void withoutItsFolderTheStartStopsWithAHint() {
        assertThatThrownBy(() -> backup(dir.resolve("vor-update")).migrate(flyway("51", "52")))
                .hasMessageContaining("BACKUP_BEFORE_MIGRATION_DIR");
    }

    @Test
    void restartsAfterAFailedMigrationDoNotBackUpAgainTheSameDay() {
        backup(dir).migrate(flyway("51", "52"));
        backup(dir).migrate(flyway("51", "52"));

        assertThat(dumped).hasSize(1);
    }

    @Test
    void keepsTheLatestTenAndAFileThatCannotGoDoesNotStopIt() throws IOException {
        for (int i = 10; i < 21; i++) {
            Files.writeString(dir.resolve("werkstatt_2026-01-" + i + "_0800_vor-V" + i + ".dump"), "old");
        }
        // cannot be deleted: a folder with something in it
        Files.createDirectories(dir.resolve("werkstatt_2026-01-01_0800_vor-V1.dump").resolve("inside"));
        Files.writeString(dir.resolve("notes.txt"), "not a backup");

        backup(dir).migrate(flyway("51", "52"));

        assertThat(files()).contains("werkstatt_2026-10-28_1830_vor-V52.dump", "notes.txt", "werkstatt_2026-01-01_0800_vor-V1.dump")
                .doesNotContain("werkstatt_2026-01-10_0800_vor-V10.dump", "werkstatt_2026-01-11_0800_vor-V11.dump")
                .hasSize(PreMigrationBackup.KEEP + 2);
    }

    @Test
    void pgDumpNeedsAUrlWithHostAndDatabase() {
        assertThatThrownBy(() -> new PgDump("jdbc:postgresql:werkstatt", "u", "p")).hasMessageContaining("jdbc:postgresql://host:port/db");
        assertThatThrownBy(() -> new PgDump("jdbc:postgresql://db:5432/", "u", "p")).isInstanceOf(IllegalArgumentException.class);
        new PgDump("jdbc:postgresql://db/werkstatt", "u", "p");
    }

    /** Flyway at {@code current} (null = fresh) with migrations pending up to {@code target} (null = none) */
    private static Flyway flyway(String current, String target) {
        // the migrations first – stubbing inside a stubbing confuses Mockito
        MigrationInfo now = current == null ? null : migration(current);
        MigrationInfo[] pending = target == null ? new MigrationInfo[0] : new MigrationInfo[] {migration(target)};
        Flyway flyway = mock(Flyway.class);
        MigrationInfoService info = mock(MigrationInfoService.class);
        when(flyway.info()).thenReturn(info);
        when(info.current()).thenReturn(now);
        when(info.pending()).thenReturn(pending);
        return flyway;
    }

    private static MigrationInfo migration(String version) {
        MigrationInfo info = mock(MigrationInfo.class);
        when(info.getVersion()).thenReturn(MigrationVersion.fromVersion(version));
        return info;
    }

    private List<String> files() throws IOException {
        try (Stream<Path> files = Files.list(dir)) {
            return files.map(p -> p.getFileName().toString()).sorted().toList();
        }
    }
}
