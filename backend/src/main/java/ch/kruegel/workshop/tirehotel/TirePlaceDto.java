package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/** A place of the tyre hotel. Which set lies there: the sets name their place. */
public record TirePlaceDto(
        UUID id,
        UUID locationId,
        @Schema(description = "Column / shelf, from 1") int a,
        @Schema(description = "Row / level, from 1") int b,
        @Schema(description = "Set on the trolley / compartment, from 1") int c,
        @Schema(example = "OG-B3-1") String address,
        @Schema(description = "False beyond the sizes of its location (made smaller)") boolean active) {

    static TirePlaceDto of(TirePlace p) {
        return new TirePlaceDto(p.getId(), p.getLocation().getId(), p.getA(), p.getB(), p.getC(), p.getAddress(), p.isActive());
    }
}
