package ch.kruegel.werkstatt.common.web;

/**
 * Eine Eingabe verletzt eine fachliche Regel, die sich nicht per Annotation am DTO prüfen
 * lässt (z.B. "Name ist schon vergeben" – dafür braucht es die Datenbank).
 *
 * <p>Wird wie ein Validierungsfehler beantwortet (HTTP 400 mit {@code fehler[]}), damit das
 * Formular die Meldung direkt beim betroffenen Feld anzeigen kann.
 *
 * <pre>
 *   throw new EingabeFehlerException("name", "ist bereits vergeben");
 * </pre>
 */
public class EingabeFehlerException extends RuntimeException {

    private final String feld;

    public EingabeFehlerException(String feld, String meldung) {
        super(meldung);
        this.feld = feld;
    }

    public String getFeld() {
        return feld;
    }
}
