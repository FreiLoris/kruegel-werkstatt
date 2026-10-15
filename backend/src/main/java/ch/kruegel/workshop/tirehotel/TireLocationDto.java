package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/** A location of the tyre hotel as delivered by the API. */
public record TireLocationDto(
        UUID id,
        long version,
        @Schema(example = "OG") String code,
        String name,
        TireLocationKind kind,
        @Schema(description = "Columns (A, B, …) or shelves") int sizeA,
        @Schema(description = "Rows or levels") int sizeB,
        @Schema(description = "Sets per field or compartments") int sizeC) {

    static TireLocationDto of(TireLocation l) {
        return new TireLocationDto(l.getId(), l.getVersion(), l.getCode(), l.getName(), l.getKind(), l.getSizeA(), l.getSizeB(), l.getSizeC());
    }
}
