package ch.kruegel.werkstatt.serviceleistung;

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

/** Serviceleistungen-API von aussen, mit echter Datenbank. Geändert wird als Person «Chef». */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class ServiceleistungApiTest {

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
    void neueLeistungKommtAnsEnde() {
        anlegen("Ölwechsel");
        MvcTestResult antwort = anlegen("  Reifen einlagern  ");

        assertThat(antwort).hasStatus(HttpStatus.CREATED);
        assertThat(antwort).bodyJson().extractingPath("$.name").isEqualTo("Reifen einlagern");
        assertThat(antwort).bodyJson().extractingPath("$.geaendertVon").isEqualTo(chef);
        assertThat(mvc.get().uri("/api/serviceleistungen")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Ölwechsel", "Reifen einlagern");
    }

    @Test
    void doppelterNameIstFeldfehler() {
        anlegen("Ölwechsel");

        MvcTestResult antwort = anlegen("ÖLWECHSEL");

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(antwort).bodyJson().extractingPath("$.fehler[0].feld").isEqualTo("name");
    }

    @Test
    void umbenennenAufVorhandenenNamenIstFeldfehler() {
        anlegen("Ölwechsel");
        String id = idVon(anlegen("Bremsen"));

        MvcTestResult antwort = senden("PUT", "/api/serviceleistungen/" + id, "{ \"name\": \" ölwechsel \", \"version\": 0 }");

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(antwort).bodyJson().extractingPath("$.fehler[0].feld").isEqualTo("name");
    }

    @Test
    void umbenennenMitVersion() {
        String id = idVon(anlegen("Oelwechsel"));

        MvcTestResult antwort = senden("PUT", "/api/serviceleistungen/" + id, "{ \"name\": \"Ölwechsel\", \"version\": 0 }");

        assertThat(antwort).hasStatus(HttpStatus.OK);
        assertThat(antwort).bodyJson().extractingPath("$.name").isEqualTo("Ölwechsel");
        assertThat(senden("PUT", "/api/serviceleistungen/" + id, "{ \"name\": \"Öl\", \"version\": 0 }"))
                .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void alleDuerfenDeaktiviertWerden() {
        // Anders als bei Lifts: Ein Auftrag kommt auch ohne Serviceleistungen aus
        String einzige = idVon(anlegen("Ölwechsel"));

        assertThat(senden("POST", "/api/serviceleistungen/" + einzige + "/deaktivieren", null)).hasStatus(HttpStatus.OK);

        assertThat(mvc.get().uri("/api/serviceleistungen")).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(mvc.get().uri("/api/serviceleistungen?inklusiveInaktive=true")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Ölwechsel");
    }

    @Test
    void reihenfolgeSetzen() {
        String oel = idVon(anlegen("Ölwechsel"));
        anlegen("Bremsen");
        String klima = idVon(anlegen("Klimaservice"));

        MvcTestResult antwort = senden("PUT", "/api/serviceleistungen/reihenfolge", "{ \"ids\": [\"%s\", \"%s\"] }".formatted(klima, oel));

        assertThat(antwort).bodyJson().extractingPath("$[*].name").asArray().containsExactly("Klimaservice", "Ölwechsel", "Bremsen");
    }

    @Test
    void aenderungenMeldenSichAlsLiveUpdate() {
        anlegen("Ölwechsel");

        assertThat(ereignisse.stream(DatenGeaendert.class)).extracting(DatenGeaendert::bereich).containsExactly("serviceleistungen");
    }

    // ── Hilfen ───────────────────────────────────────────────────────

    private MvcTestResult anlegen(String name) {
        return senden("POST", "/api/serviceleistungen", "{ \"name\": \"%s\" }".formatted(name));
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
