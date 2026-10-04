package ch.kruegel.workshop.common;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * One written form for license plates – so searching and comparing is reliable.
 * Used by courtesy cars and customer vehicles; the frontend shows the stored text as a plate.
 *
 * <ul>
 *   <li>Swiss plates: canton code + space + digits, e.g. {@code "SG 197052"} – also from
 *       {@code "sg197052"}, {@code "SG-197052"}, {@code "SG·197 052"}.</li>
 *   <li>Everything else (foreign plates, special formats): upper case, single spaces,
 *       e.g. {@code "D M AB 1234"}.</li>
 * </ul>
 */
public final class LicensePlates {

    /** The 26 canton codes as they appear on Swiss plates */
    public static final Set<String> CANTONS = Set.of(
            "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR", "JU", "LU", "NE",
            "NW", "OW", "SG", "SH", "SO", "SZ", "TG", "TI", "UR", "VD", "VS", "ZG", "ZH");

    /**
     * Canton code, optional separator (space, dash, dot, middle dot), digits with optional spaces or
     * apostrophes ("197 052", "197'052"). Only digits after the code: "GR 12345" is Graubünden,
     * "GR ABC-123" (Greece) is a foreign plate.
     */
    private static final Pattern SWISS = Pattern.compile("^([A-Z]{2})\\s*[-.·]?\\s*(\\d[\\d '’]{0,8})$");

    private LicensePlates() {
    }

    /** See class comment; empty → {@code null}. */
    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String upper = value.strip().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
        Matcher swiss = SWISS.matcher(upper);
        if (swiss.matches() && CANTONS.contains(swiss.group(1))) {
            String digits = swiss.group(2).replaceAll("[^0-9]", "");
            if (digits.length() <= 6) {
                return swiss.group(1) + " " + digits;
            }
        }
        return upper;
    }
}
