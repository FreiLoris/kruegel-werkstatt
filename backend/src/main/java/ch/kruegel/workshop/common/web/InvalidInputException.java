package ch.kruegel.workshop.common.web;

/**
 * An input violates a business rule that cannot be checked with an annotation on the DTO
 * (e.g. "name already taken" – that needs the database).
 *
 * <p>Answered like a validation error (HTTP 400 with {@code errors[]}), so the form can
 * show the message right at the affected field. The message is shown to the user, hence German.
 *
 * <pre>
 *   throw new InvalidInputException("name", "ist bereits vergeben");
 * </pre>
 */
public class InvalidInputException extends RuntimeException {

    private final String field;

    public InvalidInputException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
