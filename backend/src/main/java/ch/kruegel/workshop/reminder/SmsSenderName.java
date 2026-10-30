package ch.kruegel.workshop.reminder;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * The name a customer's phone shows as the sender of the reminder (neutral 1). Up to 11 letters and
 * digits – what the SMS providers send without unlocking; at least one letter, digits only would be
 * taken for a phone number.
 */
final class SmsSenderName {

    static final int MAX = 11;

    private static final Pattern VALID = Pattern.compile("(?=.*[A-Za-z])[A-Za-z0-9]{1," + MAX + "}");
    private static final Pattern MARKS = Pattern.compile("\\p{M}");
    private static final Pattern NOT_LETTER_OR_DIGIT = Pattern.compile("[^A-Za-z0-9]");
    /** When the company name has nothing usable */
    private static final String FALLBACK = "Werkstatt";

    private SmsSenderName() {
    }

    static boolean isValid(String name) {
        return name != null && VALID.matcher(name).matches();
    }

    /** Taken from the company name: its first word in the SMS alphabet – "Krügel Fahrzeugtechnik" → "Kruegel" */
    static String of(String companyName) {
        String firstWord = companyName == null ? "" : companyName.strip().split("\\s+", 2)[0];
        String german = firstWord.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
                .replace("Ä", "Ae").replace("Ö", "Oe").replace("Ü", "Ue").replace("ß", "ss");
        // "Garage Rémy" → "Remy": the accent off, the letter kept
        String plain = MARKS.matcher(Normalizer.normalize(german, Normalizer.Form.NFD)).replaceAll("");
        String name = NOT_LETTER_OR_DIGIT.matcher(plain).replaceAll("");
        name = name.substring(0, Math.min(MAX, name.length()));
        return isValid(name) ? name : FALLBACK;
    }

    /** "  " → none (taken from the company name again) */
    static String normalized(String name) {
        return name == null || name.isBlank() ? null : name.strip();
    }

    /** Said to the workshop when a name does not fit */
    static String rule() {
        return "höchstens %d Buchstaben oder Ziffern ohne Leerzeichen, mindestens ein Buchstabe".formatted(MAX);
    }
}
