package ch.kruegel.workshop.common.web;

/**
 * A requested record does not exist. Answered with HTTP 404.
 *
 * <pre>
 *   throw new NotFoundException("Mitarbeiter", id);
 * </pre>
 *
 * <p>{@code what} is the German display name – the message is shown to the user.
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String what, Object id) {
        super(what + " mit ID " + id + " wurde nicht gefunden.");
    }
}
