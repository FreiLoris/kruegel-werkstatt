package ch.kruegel.workshop.swissgarage;

import java.util.List;

/**
 * Result of an import in numbers.
 *
 * @param rowsRead    data rows in the file (without header and empty rows)
 * @param skipped     rows not imported: filtered out on purpose (e.g. blocked) or with a problem
 * @param created     new records
 * @param updated     changed records (incl. reactivated ones that are back in the export)
 * @param unchanged   records that were already up to date
 * @param deactivated records of earlier imports that are missing from this export
 * @param problems    one German line per problem, shown to the user
 */
public record ImportCounts(
        int rowsRead,
        int skipped,
        int created,
        int updated,
        int unchanged,
        int deactivated,
        List<String> problems) {
}
