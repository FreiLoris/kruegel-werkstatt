package ch.kruegel.workshop.dataimport;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** A column of the file in the preview, with the field its header suggests. */
public record DataImportColumnDto(
        @Schema(description = "Position, counted from 0 – the mapping refers to it") int index,
        @Schema(description = "The header, or \"Spalte 3\" without a header row") String header,
        @Schema(description = "The values of the first rows") List<String> samples,
        @Schema(types = {"string", "null"}, description = "What the header usually means") ImportField suggested) {
}
