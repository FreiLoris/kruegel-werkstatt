package ch.kruegel.werkstatt.mitarbeiter;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Alle frei änderbaren Angaben zu einer Person – beim Anlegen und beim Bearbeiten dieselben.
 *
 * <p>Prüft beim Erstellen die fachlichen Regeln und bereinigt die Werte (Leerzeichen, Farbe
 * in Kleinbuchstaben). Eine {@link Mitarbeiter}-Entität kann so nie ungültige Daten enthalten,
 * egal woher sie kommen (API, Migration, Tests).
 *
 * @param name                  Anzeigename, 1–40 Zeichen
 * @param rolle                 Funktion im Betrieb
 * @param farbe                 Hex-Farbe "#rrggbb"
 * @param geburtstag            optional
 * @param ferienanspruch        Ferientage pro Jahr, 0–60
 * @param alsMechanikerWaehlbar erscheint bei Terminen als Mechaniker
 * @param fuerAufgabenWaehlbar  erscheint bei To-dos und Notizen als zuständige Person
 * @param pinnwandSpalte        hat eine eigene Spalte auf der Pinnwand
 */
public record MitarbeiterStammdaten(
        String name,
        Rolle rolle,
        String farbe,
        LocalDate geburtstag,
        int ferienanspruch,
        boolean alsMechanikerWaehlbar,
        boolean fuerAufgabenWaehlbar,
        boolean pinnwandSpalte) {

    private static final Pattern HEX_FARBE = Pattern.compile("^#[0-9a-f]{6}$");

    public MitarbeiterStammdaten {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(rolle, "rolle");
        Objects.requireNonNull(farbe, "farbe");

        name = name.strip();
        farbe = farbe.strip().toLowerCase(Locale.ROOT);

        if (name.isEmpty() || name.length() > 40) {
            throw new IllegalArgumentException("Name muss 1–40 Zeichen lang sein: '" + name + "'");
        }
        if (!HEX_FARBE.matcher(farbe).matches()) {
            throw new IllegalArgumentException("Farbe muss im Format #rrggbb sein: '" + farbe + "'");
        }
        if (ferienanspruch < 0 || ferienanspruch > 60) {
            throw new IllegalArgumentException("Ferienanspruch muss zwischen 0 und 60 liegen: " + ferienanspruch);
        }
    }
}
