package ch.kruegel.werkstatt.common.person;

import java.util.UUID;

/**
 * Wer darf als Person ausgewählt sein? Umgesetzt vom Modul {@code mitarbeiter}.
 *
 * <p>Ein Interface statt direktem Zugriff auf Mitarbeiter: So hängt {@code common} nicht von
 * einem Fachmodul ab (die Abhängigkeit zeigt nur in eine Richtung: Fachmodul → common).
 */
public interface PersonVerzeichnis {

    /** Existiert die Person und ist sie aktiv? */
    boolean istAktiv(UUID id);

    /** Gibt es überhaupt schon aktive Personen? (Nein = Ersteinrichtung) */
    boolean gibtEsAktive();
}
