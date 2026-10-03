package ch.kruegel.werkstatt.common.person;

/**
 * Änderung von einem Gerät ohne gültige Person (z. B. TV im Modus «nur ansehen»,
 * oder die gewählte Person wurde inzwischen deaktiviert). Wird als HTTP 403 beantwortet.
 */
public class KeinePersonException extends RuntimeException {

    public KeinePersonException() {
        super("Auf diesem Gerät ist keine Person gewählt. Bitte oben rechts auswählen, wer das Gerät benutzt.");
    }
}
