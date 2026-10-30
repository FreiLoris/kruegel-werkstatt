package ch.kruegel.workshop.appmodule;

/**
 * A part of the app a workshop may not need (neutral 3) – switched off, it is gone from the menu, the
 * settings and the task. Stored by the enum's name: never rename one – and a new one needs a migration that
 * extends the CHECK of module_settings_off. All are on until switched off.
 */
public enum AppModule {

    COURTESY_CARS("Ersatzwagen", "Ersatzwagen verwalten und zu Aufträgen buchen"),
    TIRE_HOTEL("Pneuhotel", "Eingelagerte Räder, Saisonwechsel, Etiketten"),
    MFK("MFK", "Vorführen bei der Prüfstelle, Prüfstellen in den Einstellungen"),
    /** One: the to-dos of a note are on the pinboard, the board overview shows both */
    BOARD("Pinnwand & To-dos", "Notizen und Aufgaben pro Person, auch auf dem Werkstatt-TV"),
    MATERIAL("Material & Lager", "Einkaufsliste, Lager und Lieferanten"),
    STATISTICS("Statistik", "Zahlen zu Aufträgen, Kunden und Fahrzeugen");

    private final String title;
    private final String description;

    AppModule(String title, String description) {
        this.title = title;
        this.description = description;
    }

    /** German, as in the menu */
    public String title() {
        return title;
    }

    /** German: what belongs to it */
    public String description() {
        return description;
    }
}
