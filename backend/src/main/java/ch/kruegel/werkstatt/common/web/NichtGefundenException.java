package ch.kruegel.werkstatt.common.web;

/**
 * Ein angefragter Datensatz existiert nicht. Wird als HTTP 404 beantwortet.
 *
 * <pre>
 *   throw new NichtGefundenException("Mitarbeiter", id);
 * </pre>
 */
public class NichtGefundenException extends RuntimeException {

    public NichtGefundenException(String was, Object id) {
        super(was + " mit ID " + id + " wurde nicht gefunden.");
    }
}
