package ch.kruegel.workshop.common.web;

/**
 * An action is not allowed by a business rule that is not tied to a single input field
 * (e.g. "the last lift cannot be decommissioned"). Answered with HTTP 409; the message is
 * shown to the user as is – so write it in clear German.
 *
 * <pre>
 *   throw new BusinessRuleException("Mindestens ein Lift muss in Betrieb bleiben.");
 * </pre>
 *
 * <p>If the rule belongs to a field (name already taken), use {@link InvalidInputException}
 * instead – then the message appears right at the field.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
