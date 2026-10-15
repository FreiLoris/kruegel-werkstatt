package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Input for a location of the tyre hotel. The sizes mean, by kind: FLOOR – columns, rows, sets per
 * field; SHELVES – shelves, levels, compartments. The kind is only taken when creating.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record TireLocationRequest(
        @NotBlank @Pattern(regexp = "^\\s*[A-Za-z0-9]{1,6}\\s*$", message = "1–6 Buchstaben oder Ziffern, z. B. OG")
        @Schema(example = "OG", description = "Start of every address") String code,
        @NotBlank @Size(max = TireLocation.NAME_MAX) @Schema(example = "Werkstatt 1. Stock") String name,
        @NotNull TireLocationKind kind,
        @NotNull @Min(1) @Max(TireLocation.MAX_A) @Schema(description = "Columns (A, B, …) or shelves") Integer sizeA,
        @NotNull @Min(1) @Max(TireLocation.MAX_B) @Schema(description = "Rows or levels") Integer sizeB,
        @NotNull @Min(1) @Max(TireLocation.MAX_C) @Schema(description = "Sets per field or compartments") Integer sizeC,
        @Schema(description = "Only needed when editing") Long version) {
}
