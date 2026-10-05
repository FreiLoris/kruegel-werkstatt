package ch.kruegel.workshop.common;

import ch.kruegel.workshop.common.web.InvalidInputException;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Splits a search input into lower-case words: "  Huber  ZH 12 " → [huber, zh, 12].
 * Shared by the customer search and the appointment search – both check that EVERY word occurs.
 */
public final class SearchWords {

    public static final int MIN_LENGTH = 2;
    public static final int MAX_LENGTH = 100;

    private SearchWords() {
    }

    /** @throws InvalidInputException (field "q") if the input is too short or too long */
    public static List<String> of(String query) {
        String trimmed = query == null ? "" : query.strip();
        // User-facing messages, hence German
        if (trimmed.length() < MIN_LENGTH) {
            throw new InvalidInputException("q", "mindestens " + MIN_LENGTH + " Zeichen eingeben");
        }
        if (trimmed.length() > MAX_LENGTH) {
            throw new InvalidInputException("q", "höchstens " + MAX_LENGTH + " Zeichen");
        }
        return Arrays.stream(trimmed.toLowerCase(Locale.ROOT).split("\\s+")).distinct().toList();
    }
}
