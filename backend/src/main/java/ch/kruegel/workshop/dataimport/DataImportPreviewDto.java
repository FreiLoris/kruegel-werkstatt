package ch.kruegel.workshop.dataimport;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** What is in the file – nothing is stored yet. */
public record DataImportPreviewDto(
        List<DataImportColumnDto> columns,
        @Schema(description = "Data rows, without header and empty rows") int rowCount,
        @Schema(types = {"string", "null"}, description = "Character set of a CSV file (UTF-8 or windows-1252 …); null for Excel")
        String charset) {
}
