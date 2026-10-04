package ch.kruegel.workshop.common.persistence;

/**
 * Someone wants to save a record that another device has changed in the meantime.
 * Answered with HTTP 409 (Conflict).
 *
 * @see BaseEntity#checkVersion(long)
 */
public class StaleVersionException extends RuntimeException {

    public StaleVersionException(long expected, long actual) {
        super("Stale version: client has version " + expected + ", stored is version " + actual + ".");
    }
}
