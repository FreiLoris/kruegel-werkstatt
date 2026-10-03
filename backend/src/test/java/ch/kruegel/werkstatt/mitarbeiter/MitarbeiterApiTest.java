package ch.kruegel.werkstatt.mitarbeiter;

import ch.kruegel.werkstatt.TestDatenbank;
import ch.kruegel.werkstatt.TestcontainersConfiguration;
import ch.kruegel.werkstatt.common.live.DatenGeaendert;
import ch.kruegel.werkstatt.common.person.AktuellePerson;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testet die Mitarbeiter-API von aussen – so wie das Frontend sie aufruft
 * (HTTP-Request rein, JSON raus), mit echter Datenbank.
 *
 * <p>Änderungen schickt das "Gerät" als Person «Chef» (Header {@code X-Person}), ausser ein
 * Test setzt {@link #person} anders.
 */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class MitarbeiterApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private MitarbeiterRepository repository;

    @Autowired
    private ApplicationEvents ereignisse;

    @Autowired
    private JdbcTemplate jdbc;

    /** Wer auf dem Test-Gerät gewählt ist (null = keine Person, z. B. TV) */
    private String person;

    private String chef;

    @BeforeEach
    void startMitChef() {
        TestDatenbank.leeren(jdbc);
        chef = repository.save(MitarbeiterTestdaten.mitarbeiter("Chef", 0)).getId().toString();
        person = chef;
    }

    // ── Anlegen ──────────────────────────────────────────────────────

    @Test
    void legtAnUndAntwortetMit201() {
        MvcTestResult antwort = anlegen("Reto");

        assertThat(antwort).hasStatus(HttpStatus.CREATED)
                .headers().hasHeaderSatisfying("Location", werte -> assertThat(werte.getFirst()).startsWith("/api/mitarbeiter/"));
        assertThat(antwort).bodyJson().extractingPath("$.name").isEqualTo("Reto");
        assertThat(antwort).bodyJson().extractingPath("$.aktiv").isEqualTo(true);
        assertThat(antwort).bodyJson().extractingPath("$.version").isEqualTo(0);
    }

    @Test
    void neueKommenAnsEndeDerReihenfolge() {
        anlegen("Reto");
        anlegen("Erich");

        assertThat(mvc.get().uri("/api/mitarbeiter"))
                .bodyJson().extractingPath("$[*].name").asArray().containsExactly("Chef", "Reto", "Erich");
    }

    @Test
    void meldetUngueltigeEingabenProFeld() {
        MvcTestResult antwort = senden("POST", "/api/mitarbeiter", """
                { "name": " ", "rolle": "MECHANIKER", "farbe": "rot", "ferienanspruch": 99,
                  "alsMechanikerWaehlbar": true, "fuerAufgabenWaehlbar": true, "pinnwandSpalte": true }
                """);

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(antwort).bodyJson().extractingPath("$.fehler[*].feld").asArray()
                .containsExactly("farbe", "ferienanspruch", "name");
    }

    @Test
    void doppelterNameErscheintAlsFehlerBeimFeldName() {
        anlegen("Reto");

        MvcTestResult antwort = anlegen("RETO");

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(antwort).bodyJson().extractingPath("$.fehler[0].feld").isEqualTo("name");
    }

    // ── Bearbeiten ───────────────────────────────────────────────────

    @Test
    void bearbeitenZaehltDieVersionHoch() {
        String id = idVon(anlegen("Reto"));

        MvcTestResult antwort = senden("PUT", "/api/mitarbeiter/" + id, eingabe("Reto K.", 0));

        assertThat(antwort).hasStatus(HttpStatus.OK);
        assertThat(antwort).bodyJson().extractingPath("$.name").isEqualTo("Reto K.");
        assertThat(antwort).bodyJson().extractingPath("$.version").isEqualTo(1);
    }

    @Test
    void bearbeitenMitVeralteterVersionWirdAbgelehnt() {
        String id = idVon(anlegen("Reto"));
        senden("PUT", "/api/mitarbeiter/" + id, eingabe("Tablet A", 0)); // jetzt Version 1

        // Tablet B hat noch Version 0 geladen
        MvcTestResult antwort = senden("PUT", "/api/mitarbeiter/" + id, eingabe("Tablet B", 0));

        assertThat(antwort).hasStatus(HttpStatus.CONFLICT);
        assertThat(mvc.get().uri("/api/mitarbeiter/" + id)).bodyJson().extractingPath("$.name").isEqualTo("Tablet A");
    }

    @Test
    void bearbeitenOhneVersionWirdAbgelehnt() {
        String id = idVon(anlegen("Reto"));

        MvcTestResult antwort = senden("PUT", "/api/mitarbeiter/" + id, eingabe("Reto", null));

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(antwort).bodyJson().extractingPath("$.fehler[0].feld").isEqualTo("version");
    }

    @Test
    void eigenenNamenBehaltenIstKeinDuplikat() {
        String id = idVon(anlegen("Reto"));

        assertThat(senden("PUT", "/api/mitarbeiter/" + id, eingabe("Reto", 0))).hasStatus(HttpStatus.OK);
    }

    @Test
    void unbekannteIdLiefert404() {
        assertThat(mvc.get().uri("/api/mitarbeiter/0199ffff-0000-7000-8000-000000000000"))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    // ── Deaktivieren / Aktivieren ────────────────────────────────────

    @Test
    void deaktivierteErscheinenNurAufWunsch() {
        anlegen("Reto");
        String erich = idVon(anlegen("Erich"));

        assertThat(senden("POST", "/api/mitarbeiter/" + erich + "/deaktivieren", null)).hasStatus(HttpStatus.OK);

        assertThat(mvc.get().uri("/api/mitarbeiter"))
                .bodyJson().extractingPath("$[*].name").asArray().containsExactly("Chef", "Reto");
        assertThat(mvc.get().uri("/api/mitarbeiter?inklusiveInaktive=true"))
                .bodyJson().extractingPath("$[*].name").asArray().containsExactly("Chef", "Reto", "Erich");
    }

    @Test
    void aktivierenScheitertWennNameInzwischenVergeben() {
        String alterReto = idVon(anlegen("Reto"));
        senden("POST", "/api/mitarbeiter/" + alterReto + "/deaktivieren", null);
        anlegen("Reto");

        MvcTestResult antwort = senden("POST", "/api/mitarbeiter/" + alterReto + "/aktivieren", null);

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(antwort).bodyJson().extractingPath("$.fehler[0].feld").isEqualTo("name");
    }

    // ── Reihenfolge ──────────────────────────────────────────────────

    @Test
    void reihenfolgeSetzenStelltGenannteNachVorneUndRestDahinter() {
        anlegen("Reto");
        String erich = idVon(anlegen("Erich"));
        String doeme = idVon(anlegen("Döme"));

        MvcTestResult antwort = senden("PUT", "/api/mitarbeiter/reihenfolge", """
                { "ids": ["%s", "%s"] }
                """.formatted(doeme, erich));

        assertThat(antwort).hasStatus(HttpStatus.OK);
        assertThat(antwort).bodyJson().extractingPath("$[*].name").asArray().containsExactly("Döme", "Erich", "Chef", "Reto");
    }

    // ── Wer bin ich? (Person pro Gerät) ──────────────────────────────

    @Test
    void merktSichWerAngelegtUndGeaendertHat() {
        MvcTestResult antwort = anlegen("Reto");

        assertThat(antwort).bodyJson().extractingPath("$.geaendertVon").isEqualTo(chef);
        assertThat(repository.findById(UUID.fromString(idVon(antwort))).orElseThrow().getErstelltVon())
                .hasToString(chef);
    }

    @Test
    void aenderungOhnePersonWirdAbgelehnt() {
        person = null; // z. B. TV im Modus «nur ansehen»

        MvcTestResult antwort = anlegen("Reto");

        assertThat(antwort).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(antwort).bodyJson().extractingPath("$.title").isEqualTo("Keine Person gewählt");
    }

    @Test
    void aenderungVonDeaktivierterPersonWirdAbgelehnt() {
        String erich = idVon(anlegen("Erich"));
        senden("POST", "/api/mitarbeiter/" + erich + "/deaktivieren", null);
        person = erich; // Tablet, auf dem noch Erich gewählt ist

        assertThat(anlegen("Reto")).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void unbekannteOderKaputtePersonZaehltAlsKeine() {
        person = "0199ffff-0000-7000-8000-000000000000";
        assertThat(anlegen("Reto")).hasStatus(HttpStatus.FORBIDDEN);

        person = "kaputt";
        assertThat(anlegen("Reto")).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void lesenGehtAuchOhnePerson() {
        person = null;

        assertThat(mvc.get().uri("/api/mitarbeiter")).hasStatus(HttpStatus.OK);
    }

    @Test
    void ersteinrichtungGehtOhnePerson() {
        TestDatenbank.leeren(jdbc); // noch niemand erfasst → niemand kann gewählt sein
        person = null;

        MvcTestResult antwort = anlegen("Reto");

        assertThat(antwort).hasStatus(HttpStatus.CREATED);
        assertThat(antwort).bodyJson().extractingPath("$.geaendertVon").isNull();
    }

    // ── Live-Updates ─────────────────────────────────────────────────

    @Test
    void jedeAenderungMeldetSichAlsLiveUpdate() {
        String id = idVon(anlegen("Reto"));
        senden("PUT", "/api/mitarbeiter/" + id, eingabe("Reto K.", 0));
        senden("POST", "/api/mitarbeiter/" + id + "/deaktivieren", null);

        assertThat(ereignisse.stream(DatenGeaendert.class))
                .extracting(DatenGeaendert::bereich)
                .containsExactly("mitarbeiter", "mitarbeiter", "mitarbeiter");
    }

    // ── Hilfen ───────────────────────────────────────────────────────

    private MvcTestResult anlegen(String name) {
        return senden("POST", "/api/mitarbeiter", eingabe(name, null));
    }

    private static String eingabe(String name, Integer version) {
        return """
                { "name": "%s", "rolle": "MECHANIKER", "farbe": "#9FC8F0", "geburtstag": "1995-05-18",
                  "ferienanspruch": 20, "alsMechanikerWaehlbar": true, "fuerAufgabenWaehlbar": true,
                  "pinnwandSpalte": true, "version": %s }
                """.formatted(name, version);
    }

    private MvcTestResult senden(String methode, String uri, String json) {
        var anfrage = switch (methode) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(methode);
        };
        if (person != null) {
            anfrage = anfrage.header(AktuellePerson.HEADER, person);
        }
        if (json != null) {
            anfrage = anfrage.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return anfrage.exchange();
    }

    private static String idVon(MvcTestResult antwort) {
        try {
            return JsonPath.read(antwort.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
