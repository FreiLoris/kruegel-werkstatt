package ch.kruegel.workshop.common.persistence;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PreMigrationBackupTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-28T17:30:00Z"), ZoneId.of("Europe/Zurich"));

    @TempDir
    Path dir;

    @Test
    void backsUpBeforeAMigrationUnderANameWithTimeAndTarget() throws IOException {
        PreMigrationBackup backup = new PreMigrationBackup(dir, file -> Files.writeString(file, "dump"), CLOCK);

        Path file = backup.before("51", "52").orElseThrow();

        assertThat(file.getFileName()).hasToString("werkstatt_2026-10-28_1830_vor-V52.dump");
        assertThat(file).hasContent("dump");
        // no half-written file left
        assertThat(files()).containsExactly("werkstatt_2026-10-28_1830_vor-V52.dump");
    }

    @Test
    void nothingToSaveOnAFreshDatabaseOrWithoutMigration() throws IOException {
        PreMigrationBackup backup = new PreMigrationBackup(dir, file -> {
            throw new AssertionError("no dump expected");
        }, CLOCK);

        assertThat(backup.before(null, "52")).isEmpty();
        assertThat(backup.before("52", null)).isEmpty();
        assertThat(files()).isEmpty();
    }

    @Test
    void aFailedDumpStopsTheMigrationAndLeavesNoFile() throws IOException {
        PreMigrationBackup backup = new PreMigrationBackup(dir, file -> {
            Files.writeString(file, "half");
            throw new IOException("pg_dump exited with 1");
        }, CLOCK);

        assertThatThrownBy(() -> backup.before("51", "52")).hasMessageContaining("not migrated");
        assertThat(files()).isEmpty();
    }

    @Test
    void withoutItsFolderTheStartStopsWithAHint() {
        PreMigrationBackup backup = new PreMigrationBackup(dir.resolve("vor-update"), file -> Files.writeString(file, "dump"), CLOCK);

        assertThatThrownBy(() -> backup.before("51", "52")).hasMessageContaining("BACKUP_BEFORE_MIGRATION_DIR");
    }

    @Test
    void keepsTheLatestTenOnly() throws IOException {
        for (int i = 10; i < 21; i++) {
            Files.writeString(dir.resolve("werkstatt_2026-01-" + i + "_0800_vor-V" + i + ".dump"), "old");
        }
        Files.writeString(dir.resolve("notes.txt"), "not a backup");

        new PreMigrationBackup(dir, file -> Files.writeString(file, "dump"), CLOCK).before("51", "52");

        assertThat(files()).hasSize(PreMigrationBackup.KEEP + 1)
                .contains("werkstatt_2026-10-28_1830_vor-V52.dump", "notes.txt")
                .doesNotContain("werkstatt_2026-01-10_0800_vor-V10.dump", "werkstatt_2026-01-11_0800_vor-V11.dump");
    }

    private List<String> files() throws IOException {
        try (Stream<Path> files = Files.list(dir)) {
            return files.map(p -> p.getFileName().toString()).sorted().toList();
        }
    }
}
