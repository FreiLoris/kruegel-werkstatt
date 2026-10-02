package ch.kruegel.werkstatt.common.persistence;

/**
 * Jemand will einen Datensatz speichern, den inzwischen ein anderes Gerät geändert hat.
 * Wird als HTTP 409 (Conflict) beantwortet.
 *
 * @see BaseEntity#pruefeVersion(long)
 */
public class VeralteteVersionException extends RuntimeException {

    public VeralteteVersionException(long erwartet, long aktuell) {
        super("Veraltete Version: Client hat Version " + erwartet + ", gespeichert ist Version " + aktuell + ".");
    }
}
