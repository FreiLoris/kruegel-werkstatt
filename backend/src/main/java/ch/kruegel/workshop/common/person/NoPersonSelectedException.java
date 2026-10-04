package ch.kruegel.workshop.common.person;

/**
 * Change from a device without a valid person (e.g. TV in view-only mode, or the selected
 * person has been deactivated meanwhile). Answered with HTTP 403.
 *
 * <p>The message is shown to the user, hence German.
 */
public class NoPersonSelectedException extends RuntimeException {

    public NoPersonSelectedException() {
        super("Auf diesem Gerät ist keine Person gewählt. Bitte oben rechts auswählen, wer das Gerät benutzt.");
    }
}
