package ch.kruegel.werkstatt.lift;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** Ein Lift, wie ihn die API ausliefert. */
public record LiftDto(
        UUID id,
        long version,
        String name,
        boolean aktiv,
        int reihenfolge,
        Instant geaendertAm,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Wer zuletzt geändert hat (leer: Ausgangsdaten)") UUID geaendertVon) {

    static LiftDto von(Lift lift) {
        return new LiftDto(lift.getId(), lift.getVersion(), lift.getName(), lift.isAktiv(), lift.getReihenfolge(),
                lift.getGeaendertAm(), lift.getGeaendertVon());
    }
}
