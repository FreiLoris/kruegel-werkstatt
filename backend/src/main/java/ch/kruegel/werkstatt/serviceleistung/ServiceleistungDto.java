package ch.kruegel.werkstatt.serviceleistung;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** Eine Serviceleistung, wie sie die API ausliefert. */
public record ServiceleistungDto(
        UUID id,
        long version,
        String name,
        boolean aktiv,
        int reihenfolge,
        Instant geaendertAm,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Wer zuletzt geändert hat (leer: Ausgangsdaten)") UUID geaendertVon) {

    static ServiceleistungDto von(Serviceleistung leistung) {
        return new ServiceleistungDto(leistung.getId(), leistung.getVersion(), leistung.getName(), leistung.isAktiv(),
                leistung.getReihenfolge(), leistung.getGeaendertAm(), leistung.getGeaendertVon());
    }
}
