package ch.kruegel.werkstatt.mitarbeiter;

/**
 * Funktion einer Person im Betrieb. Wird in der Datenbank als Text gespeichert
 * (z.B. "MECHANIKER") – die Anzeige ("Mechaniker", "Büro") übernimmt das Frontend.
 */
public enum Rolle {
    GESCHAEFTSFUEHRUNG,
    MECHANIKER,
    BUERO,
    LERNENDER,
    PRAKTIKUM
}
