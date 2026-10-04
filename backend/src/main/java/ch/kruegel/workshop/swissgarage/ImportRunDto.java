package ch.kruegel.workshop.swissgarage;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** One import in the log, as delivered by the API. */
public record ImportRunDto(
        UUID id,
        ImportRun.Kind kind,
        String fileName,
        @Schema(description = "When the import ran") Instant importedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who imported (person of the device)") UUID importedBy,
        int rowsRead,
        int skipped,
        int created,
        int updated,
        int unchanged,
        int deactivated,
        @Schema(description = "One German line per problem, e.g. \"Zeile 17: kein Name\"") List<String> problems) {

    static ImportRunDto of(ImportRun run) {
        ImportCounts c = run.getCounts();
        return new ImportRunDto(run.getId(), run.getKind(), run.getFileName(), run.getCreatedAt(), run.getCreatedBy(),
                c.rowsRead(), c.skipped(), c.created(), c.updated(), c.unchanged(), c.deactivated(), c.problems());
    }
}
