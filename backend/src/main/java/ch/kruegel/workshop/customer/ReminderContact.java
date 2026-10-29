package ch.kruegel.workshop.customer;

import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Where a reminder of the appointment goes (17a): an SMS to a mobile number, else an e-mail. A Swiss
 * number must be a mobile one (07x) – "Telefon" often holds one too; a foreign number counts only
 * in "Mobile", there it is the customer's mobile.
 *
 * @param recipient the number as "+41791234567", or the e-mail address
 */
public record ReminderContact(ReminderChannel channel, String recipient) {

    private static final Pattern SWISS_MOBILE = Pattern.compile("\\+417[5-9]\\d{7}");
    private static final Pattern FOREIGN = Pattern.compile("\\+(?!41)[1-9]\\d{7,14}");
    private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");

    /** Empty: neither a mobile number nor an e-mail – the customer has to be called. */
    public static Optional<ReminderContact> of(CustomerDetails customer) {
        Optional<String> mobile = textableNumber(customer.mobile(), true).or(() -> textableNumber(customer.phone(), false));
        if (mobile.isPresent()) {
            return Optional.of(new ReminderContact(ReminderChannel.SMS, mobile.get()));
        }
        String email = customer.email();
        return email != null && EMAIL.matcher(email).matches()
                ? Optional.of(new ReminderContact(ReminderChannel.EMAIL, email))
                : Optional.empty();
    }

    /** "079 123 45 67", "0041 79 …", "+41 (0)79 …" → "+41791234567"; empty for a landline or no number */
    static Optional<String> textableNumber(String text, boolean foreignAllowed) {
        if (text == null) {
            return Optional.empty();
        }
        String number = text.replace("(0)", "").replaceAll("[\\s./()-]", "");
        if (number.startsWith("00")) {
            number = "+" + number.substring(2);
        } else if (number.startsWith("0")) {
            number = "+41" + number.substring(1);
        }
        if (SWISS_MOBILE.matcher(number).matches() || (foreignAllowed && FOREIGN.matcher(number).matches())) {
            return Optional.of(number);
        }
        return Optional.empty();
    }
}
