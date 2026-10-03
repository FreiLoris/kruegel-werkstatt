package ch.kruegel.werkstatt.mitarbeiter;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Ein Mitarbeiter, wie ihn die API ausliefert. Die Entity selbst verlässt das Backend nie –
 * so können wir die Datenbank ändern, ohne die API zu brechen (und umgekehrt).
 */
public record MitarbeiterDto(
        UUID id,
        long version,
        String name,
        Rolle rolle,
        String farbe,
        @Schema(types = {"string", "null"}, format = "date") LocalDate geburtstag,
        int ferienanspruch,
        boolean alsMechanikerWaehlbar,
        boolean fuerAufgabenWaehlbar,
        boolean pinnwandSpalte,
        boolean aktiv,
        int reihenfolge,
        Instant geaendertAm,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Wer zuletzt geändert hat (leer: Testdaten/Ersteinrichtung)") UUID geaendertVon) {

    static MitarbeiterDto von(Mitarbeiter m) {
        return new MitarbeiterDto(m.getId(), m.getVersion(), m.getName(), m.getRolle(), m.getFarbe(),
                m.getGeburtstag(), m.getFerienanspruch(), m.isAlsMechanikerWaehlbar(),
                m.isFuerAufgabenWaehlbar(), m.isPinnwandSpalte(), m.isAktiv(), m.getReihenfolge(),
                m.getGeaendertAm(), m.getGeaendertVon());
    }
}
