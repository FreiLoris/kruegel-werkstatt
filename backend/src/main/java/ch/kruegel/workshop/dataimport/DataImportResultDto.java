package ch.kruegel.workshop.dataimport;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * What the import did – or, on a dry run, would do.
 *
 * @param skipped rows not taken over at all (no name, text too long)
 */
public record DataImportResultDto(
        boolean dryRun,
        int rowsRead,
        int customersCreated,
        @Schema(description = "Same name and address as a customer of the app – taken as it is") int customersExisting,
        int vehiclesCreated,
        @Schema(description = "Same chassis number or plate as a vehicle of the app") int vehiclesExisting,
        @Schema(description = "Vehicles not taken over (no make and model, twice in the file …)") int vehiclesSkipped,
        int skipped,
        @Schema(description = "One German line per problem, e.g. \"Zeile 17: kein Name\"") List<String> problems) {
}
