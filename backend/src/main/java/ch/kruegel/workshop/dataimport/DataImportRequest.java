package ch.kruegel.workshop.dataimport;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * How to read the file: which column is which field. Columns not listed are not taken over.
 *
 * @param charset        {@code null}: as found out from the file
 * @param firstRowIsData the file has no header row
 * @param dryRun         only count what would happen – nothing is stored
 */
public record DataImportRequest(
        @NotNull @Size(max = 200) List<@Valid @NotNull Column> columns,
        @Schema(types = {"string", "null"}) @Size(max = 20) String charset,
        boolean firstRowIsData,
        boolean dryRun) {

    /** Column {@code index} (from 0) holds {@code field}; named for the API – "Column" alone says nothing there */
    @Schema(name = "DataImportColumnMapping")
    public record Column(@Min(0) int index, @NotNull ImportField field) {
    }
}
