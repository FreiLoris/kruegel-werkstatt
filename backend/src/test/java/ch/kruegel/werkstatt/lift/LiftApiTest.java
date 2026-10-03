package ch.kruegel.werkstatt.lift;

import ch.kruegel.werkstatt.TestDatenbank;
import ch.kruegel.werkstatt.TestcontainersConfiguration;
import ch.kruegel.werkstatt.common.live.DatenGeaendert;
import ch.kruegel.werkstatt.common.person.AktuellePerson;
import ch.kruegel.werkstatt.mitarbeiter.MitarbeiterRepository;
import ch.kruegel.werkstatt.mitarbeiter.MitarbeiterTestdaten;
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

import static org.assertj.core.api.Assertions.assertThat;

/** Lift-API von aussen, mit echter Datenbank. Geändert wird als Person «Chef». */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class LiftApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private MitarbeiterRepository mitarbeiter;

    @Autowired
    private ApplicationEvents ereignisse;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startMitChef() {
        TestDatenbank.leeren(jdbc);
        chef = mitarbeiter.save(MitarbeiterTestdaten.mitarbeiter("Chef", 0)).getId().toString();
    }

    @Test
    void neuerLiftKommtAnsEnde() {
        anlegen("Lift 1");
        MvcTestResult antwort = anlegen("  Grube  ");

        assertThat(antwort).hasStatus(HttpStatus.CREATED);
        assertThat(antwort).bodyJson().extractingPath("$.name").isEqualTo("Grube");
        assertThat(antwort).bodyJson().extractingPath("$.geaendertVon").isEqualTo(chef);
        assertThat(mvc.get().uri("/api/lifts")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Lift 1", "Grube");
    }

    @Test
    void doppelterNameIstFeldfehler() {
        anlegen("Lift 1");

        MvcTestResult antwort = anlegen("LIFT 1");

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(antwort).bodyJson().extractingPath("$.fehler[0].feld").isEqualTo("name");
    }

    @Test
    void umbenennenMitVersion() {
        String id = idVon(anlegen("Lift 1"));

        MvcTestResult antwort = senden("PUT", "/api/lifts/" + id, "{ \"name\": \"Lift A\", \"version\": 0 }");

        assertThat(antwort).hasStatus(HttpStatus.OK);
        assertThat(antwort).bodyJson().extractingPath("$.name").isEqualTo("Lift A");
        assertThat(senden("PUT", "/api/lifts/" + id, "{ \"name\": \"Lift B\", \"version\": 0 }"))
                .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void stillgelegteErscheinenNurAufWunsch() {
        anlegen("Lift 1");
        String zwei = idVon(anlegen("Lift 2"));

        assertThat(senden("POST", "/api/lifts/" + zwei + "/deaktivieren", null)).hasStatus(HttpStatus.OK);

        assertThat(mvc.get().uri("/api/lifts")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Lift 1");
        assertThat(mvc.get().uri("/api/lifts?inklusiveInaktive=true")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Lift 1", "Lift 2");
    }

    @Test
    void letzterAktiverLiftBleibt() {
        String einziger = idVon(anlegen("Lift 1"));

        MvcTestResult antwort = senden("POST", "/api/lifts/" + einziger + "/deaktivieren", null);

        assertThat(antwort).hasStatus(HttpStatus.CONFLICT);
        assertThat(antwort).bodyJson().extractingPath("$.detail").isEqualTo("Mindestens ein Lift muss in Betrieb bleiben.");
    }

    @Test
    void reihenfolgeSetzen() {
        String eins = idVon(anlegen("Lift 1"));
        anlegen("Lift 2");
        String drei = idVon(anlegen("Lift 3"));

        MvcTestResult antwort = senden("PUT", "/api/lifts/reihenfolge", "{ \"ids\": [\"%s\", \"%s\"] }".formatted(drei, eins));

        assertThat(antwort).bodyJson().extractingPath("$[*].name").asArray().containsExactly("Lift 3", "Lift 1", "Lift 2");
    }

    @Test
    void aenderungenMeldenSichAlsLiveUpdate() {
        anlegen("Lift 1");

        assertThat(ereignisse.stream(DatenGeaendert.class)).extracting(DatenGeaendert::bereich).containsExactly("lifts");
    }

    // ── Hilfen ───────────────────────────────────────────────────────

    private MvcTestResult anlegen(String name) {
        return senden("POST", "/api/lifts", "{ \"name\": \"%s\" }".formatted(name));
    }

    private MvcTestResult senden(String methode, String uri, String json) {
        var anfrage = switch (methode) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(methode);
        };
        anfrage = anfrage.header(AktuellePerson.HEADER, chef);
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
