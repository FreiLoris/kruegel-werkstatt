package ch.kruegel.werkstatt.common.web;

/**
 * Eine Aktion ist fachlich nicht erlaubt, unabhängig von einem bestimmten Eingabefeld
 * (z. B. "der letzte Lift kann nicht stillgelegt werden"). Wird als HTTP 409 beantwortet,
 * die Meldung erscheint so wie sie ist beim Benutzer – also verständlich formulieren.
 *
 * <pre>
 *   throw new RegelVerletztException("Mindestens ein Lift muss in Betrieb bleiben.");
 * </pre>
 *
 * <p>Gehört die Regel zu einem Feld (Name schon vergeben), stattdessen
 * {@link EingabeFehlerException} verwenden – dann steht die Meldung direkt beim Feld.
 */
public class RegelVerletztException extends RuntimeException {

    public RegelVerletztException(String meldung) {
        super(meldung);
    }
}
