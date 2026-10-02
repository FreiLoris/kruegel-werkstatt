package ch.kruegel.werkstatt.common.live;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * "In diesem Bereich hat sich etwas geändert" – wird an alle offenen Browser geschickt,
 * damit sie die betroffenen Daten neu laden.
 *
 * <p>Verwendung in einem Service, nach dem Speichern:
 * <pre>
 *   events.publishEvent(new DatenGeaendert("mitarbeiter"));
 * </pre>
 *
 * <p>{@code bereich} entspricht dem ersten Teil des Query-Keys im Frontend
 * (z.B. {@code ['mitarbeiter', ...]}). Verschickt wird erst, wenn die Transaktion
 * erfolgreich abgeschlossen ist – siehe {@link LiveUpdateService}.
 *
 * @param bereich Fachbereich in Kleinbuchstaben, z.B. "mitarbeiter", "auftraege"
 */
public record DatenGeaendert(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "mitarbeiter") String bereich) {
}
