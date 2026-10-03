package ch.kruegel.werkstatt;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Leert alle Fachtabellen – für Tests, die von aussen (über die API) testen und darum
 * nicht automatisch zurückgerollt werden.
 *
 * <p>Alle Tabellen in EINEM Befehl: Sie verweisen über {@code erstellt_von}/{@code geaendert_von}
 * auf {@code mitarbeiter}. Einzeln geleert käme es je nach Reihenfolge zu Fremdschlüssel-Fehlern.
 *
 * <p><b>Neue Tabelle → hier ergänzen.</b>
 */
public final class TestDatenbank {

    private static final String FACHTABELLEN = "lift, mitarbeiter";

    private TestDatenbank() {
    }

    public static void leeren(JdbcTemplate jdbc) {
        jdbc.execute("TRUNCATE " + FACHTABELLEN);
    }
}
