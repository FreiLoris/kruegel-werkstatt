package ch.kruegel.workshop.reminder;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * How many SMS a text costs (17e). The text is sent in the SMS alphabet (GSM 7-bit, ASPSMS
 * "ForceGSM7bit"): 160 characters in one SMS, 153 per part beyond; €, [ ] { } and a few more count
 * twice. Other characters ("č", a typographic dash) are replaced on the way – said, so the wording
 * can avoid them.
 *
 * @param characters as the SMS counts them
 * @param parts      SMS it takes
 * @param replaced   characters outside the SMS alphabet, each once
 */
record SmsLength(int characters, int parts, List<String> replaced) {

    private static final String BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡"
            + "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
    private static final String EXTENDED = "^{}\\[~]|€\f";

    static SmsLength of(String text) {
        int characters = 0;
        Set<String> replaced = new LinkedHashSet<>();
        for (int i = 0; i < text.length(); i = text.offsetByCodePoints(i, 1)) {
            String c = new String(Character.toChars(text.codePointAt(i)));
            if (BASIC.contains(c)) {
                characters += 1;
            } else if (EXTENDED.contains(c)) {
                characters += 2;
            } else {
                characters += 1;
                replaced.add(c);
            }
        }
        int parts = characters <= 160 ? 1 : (characters + 152) / 153;
        return new SmsLength(characters, parts, List.copyOf(replaced));
    }
}
