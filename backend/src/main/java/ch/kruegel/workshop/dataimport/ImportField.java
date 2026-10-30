package ch.kruegel.workshop.dataimport;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * What a column of the file can be (neutral 5) – with the header names that usually stand above it,
 * to suggest the mapping. Compared without case, spaces, dots and umlauts ("Tel. 1" = "tel1").
 */
public enum ImportField {

    SALUTATION("Anrede", Kind.TEXT, "anrede", "salutation", "titel"),
    LAST_NAME("Name", Kind.TEXT, "name", "nachname", "familienname", "lastname", "surname", "kundenname"),
    FIRST_NAME("Vorname", Kind.TEXT, "vorname", "firstname", "rufname"),
    COMPANY("Firma", Kind.TEXT, "firma", "firmenname", "company", "unternehmen"),
    ADDITION("Zusatz", Kind.TEXT, "zusatz", "adresszusatz", "zhd", "co"),
    /** Several columns are joined: "Strasse" + "Hausnummer" */
    STREET("Strasse", Kind.TEXT, "strasse", "str", "strassenr", "strasseundnr", "strassehausnummer", "adresse",
            "address", "street", "hausnummer", "hausnr", "nr"),
    POSTAL_CODE("PLZ", Kind.TEXT, "plz", "postleitzahl", "zip", "zipcode", "npa"),
    CITY("Ort", Kind.TEXT, "ort", "wohnort", "ortschaft", "stadt", "city"),
    /** "8400 Winterthur" in one column */
    POSTAL_CODE_CITY("PLZ und Ort", Kind.TEXT, "plzort", "plzundort", "plzwohnort"),
    PHONE("Telefon", Kind.TEXT, "telefon", "tel", "tel1", "telefon1", "telefonprivat", "telprivat", "telefongeschaeft",
            "telgeschaeft", "phone"),
    MOBILE("Handy", Kind.TEXT, "handy", "natel", "mobile", "mobil", "mobiltelefon", "telmobil"),
    EMAIL("E-Mail", Kind.TEXT, "email", "mail", "emailadresse"),

    LICENSE_PLATE("Kontrollschild", Kind.TEXT, "kontrollschild", "kennzeichen", "schild", "kontrollschildnr",
            "nummernschild", "polizeinummer", "kz", "plate"),
    MAKE("Marke", Kind.TEXT, "marke", "fabrikat", "hersteller", "make"),
    MODEL("Modell", Kind.TEXT, "modell", "typ", "fahrzeugtyp", "model"),
    VIN("Fahrgestellnummer", Kind.TEXT, "fahrgestellnummer", "fahrgestellnr", "chassisnr", "chassisnummer", "vin", "fin"),
    FIRST_REGISTRATION("1. Inverkehrsetzung", Kind.DATE, "1inverkehrsetzung", "inverkehrsetzung", "1inv", "inv",
            "erstzulassung", "ersteinloesung", "1zulassung"),
    MODEL_YEAR("Jahrgang", Kind.NUMBER, "jahrgang", "jahrg", "baujahr", "modelljahr"),
    MILEAGE("Kilometerstand", Kind.NUMBER, "kmstand", "km", "kilometerstand", "kilometer"),
    LAST_MFK("Letzte MFK", Kind.DATE, "letztemfk", "mfk", "mfkdatum", "letztepruefung"),
    COLOR("Farbe", Kind.TEXT, "farbe", "color"),
    FUEL("Treibstoff", Kind.TEXT, "treibstoff", "kraftstoff", "antrieb", "fuel");

    enum Kind { TEXT, DATE, NUMBER }

    /** The fields that make a row also a vehicle */
    static final Set<ImportField> VEHICLE = EnumSet.range(LICENSE_PLATE, FUEL);

    private final String label;
    private final Kind kind;
    private final List<String> headers;

    ImportField(String label, Kind kind, String... headers) {
        this.label = label;
        this.kind = kind;
        this.headers = List.of(headers);
    }

    /** German, for messages */
    String label() {
        return label;
    }

    Kind kind() {
        return kind;
    }

    /** Text fields may come from several columns (joined with a space) – a date or number not */
    boolean joinable() {
        return kind == Kind.TEXT;
    }

    /** The field a header usually means, if any */
    static Optional<ImportField> suggest(String header) {
        String key = key(header);
        return Arrays.stream(values()).filter(field -> field.headers.contains(key)).findFirst();
    }

    /** "Tel. 1" → "tel1", "Straße" → "strasse", "1. Inv." → "1inv" */
    static String key(String header) {
        String lower = header.toLowerCase(Locale.ROOT)
                .replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss");
        return Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("[^a-z0-9]", "");
    }
}
