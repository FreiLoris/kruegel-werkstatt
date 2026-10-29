package ch.kruegel.workshop.reminder;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The reminder's wording with placeholders (17e) – the workshop's own, set in the settings. A line
 * with a placeholder that is empty for a task (no plate, no phone of the workshop) is left out.
 */
final class SmsTemplate {

    static final int MAX = 600;

    /** "Guten Tag Herr Huber" */
    static final String GREETING = "Anrede";
    /** "Morgen, Fr 30.10., 08:00 Uhr" – a car that comes earlier: that time, "(bitte Fahrzeug bringen)" */
    static final String WHEN = "Termin";
    static final String PLATE = "Kennzeichen";
    /** The workshop's phone */
    static final String PHONE = "Telefon";
    /** The workshop's name */
    static final String COMPANY = "Firma";

    static final List<String> PLACEHOLDERS = List.of(GREETING, WHEN, PLATE, PHONE, COMPANY);

    /** The app's text (feedback 2026-10-29: short lines, the day and the number on lines of their own) */
    static final String STANDARD = """
            {Anrede}

            Wir erinnern Sie an Ihren Termin:
            {Termin}
            Fahrzeug {Kennzeichen}

            Bei Verhinderung bitte melden:
            {Telefon}

            Freundliche Grüsse
            {Firma}""";

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([^{}]*)}");

    private SmsTemplate() {
    }

    /**
     * What the template has that the app does not know – a typo like "{Datum}", or a brace without its
     * partner ("{Anrede" would reach the customer as it is).
     */
    static List<String> unknownPlaceholders(String template) {
        Set<String> unknown = new LinkedHashSet<>();
        Matcher matcher = PLACEHOLDER.matcher(template);
        while (matcher.find()) {
            if (!PLACEHOLDERS.contains(matcher.group(1))) {
                unknown.add(matcher.group(0));
            }
        }
        String rest = matcher.replaceAll("");
        if (rest.contains("{") || rest.contains("}")) {
            unknown.add("Klammer ohne Gegenstück");
        }
        return List.copyOf(unknown);
    }

    /**
     * The text for one task: placeholders filled, lines with an empty one left out – and a line ending
     * in ":" right before it, it introduced the missing value ("Bei Verhinderung bitte melden:" without
     * a phone). One the app does not know stays as it is – the preview shows the typo where it is.
     */
    static String fill(String template, Map<String, String> values) {
        List<String> lines = new ArrayList<>();
        for (String line : template.replace("\r\n", "\n").split("\n", -1)) {
            Matcher matcher = PLACEHOLDER.matcher(line);
            StringBuilder filled = new StringBuilder();
            boolean empty = false;
            while (matcher.find()) {
                String name = matcher.group(1);
                String value = PLACEHOLDERS.contains(name) ? values.get(name) : matcher.group(0);
                empty |= value == null || value.isBlank();
                matcher.appendReplacement(filled, Matcher.quoteReplacement(value == null ? "" : value));
            }
            matcher.appendTail(filled);
            if (!empty) {
                lines.add(filled.toString().stripTrailing());
            } else if (!lines.isEmpty() && lines.getLast().endsWith(":")) {
                lines.removeLast();
            }
        }
        // a left-out line must not leave two blank lines behind
        return String.join("\n", lines).replaceAll("\n{3,}", "\n\n").strip();
    }
}
