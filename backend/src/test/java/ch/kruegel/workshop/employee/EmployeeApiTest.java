package ch.kruegel.workshop.employee;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
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
 * Tests the employee API from the outside – the way the frontend calls it
 * (HTTP request in, JSON out), with a real database.
 *
 * <p>The "device" sends changes as person "Chef" (header {@code X-Person}), unless a test
 * sets {@link #person} differently.
 */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class EmployeeApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository repository;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private JdbcTemplate jdbc;

    /** Who is selected on the test device (null = no person, e.g. TV) */
    private String person;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = repository.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        person = chef;
    }

    // ── Create ───────────────────────────────────────────────────────

    @Test
    void createsAndAnswersWith201() {
        MvcTestResult response = create("Reto");

        assertThat(response).hasStatus(HttpStatus.CREATED)
                .headers().hasHeaderSatisfying("Location", values -> assertThat(values.getFirst()).startsWith("/api/employees/"));
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Reto");
        assertThat(response).bodyJson().extractingPath("$.active").isEqualTo(true);
        assertThat(response).bodyJson().extractingPath("$.version").isEqualTo(0);
    }

    @Test
    void newOnesGoToTheEndOfTheOrder() {
        create("Reto");
        create("Erich");

        assertThat(mvc.get().uri("/api/employees"))
                .bodyJson().extractingPath("$[*].name").asArray().containsExactly("Chef", "Reto", "Erich");
    }

    @Test
    void reportsInvalidInputPerField() {
        MvcTestResult response = send("POST", "/api/employees", """
                { "name": " ", "role": "MECHANIC", "color": "rot", "vacationDaysPerYear": 99,
                  "selectableAsMechanic": true, "selectableForTodos": true, "hasPinboardColumn": true }
                """);

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[*].field").asArray()
                .containsExactly("color", "name", "vacationDaysPerYear");
    }

    @Test
    void duplicateNameIsAnErrorAtFieldName() {
        create("Reto");

        MvcTestResult response = create("RETO");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    // ── Update ───────────────────────────────────────────────────────

    @Test
    void updateIncrementsTheVersion() {
        String id = idOf(create("Reto"));

        MvcTestResult response = send("PUT", "/api/employees/" + id, request("Reto K.", 0));

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Reto K.");
        assertThat(response).bodyJson().extractingPath("$.version").isEqualTo(1);
    }

    @Test
    void updateWithStaleVersionIsRejected() {
        String id = idOf(create("Reto"));
        send("PUT", "/api/employees/" + id, request("Tablet A", 0)); // now version 1

        // Tablet B still has version 0 loaded
        MvcTestResult response = send("PUT", "/api/employees/" + id, request("Tablet B", 0));

        assertThat(response).hasStatus(HttpStatus.CONFLICT);
        assertThat(mvc.get().uri("/api/employees/" + id)).bodyJson().extractingPath("$.name").isEqualTo("Tablet A");
    }

    @Test
    void updateWithoutVersionIsRejected() {
        String id = idOf(create("Reto"));

        MvcTestResult response = send("PUT", "/api/employees/" + id, request("Reto", null));

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("version");
    }

    @Test
    void keepingOwnNameIsNoDuplicate() {
        String id = idOf(create("Reto"));

        assertThat(send("PUT", "/api/employees/" + id, request("Reto", 0))).hasStatus(HttpStatus.OK);
    }

    @Test
    void unknownIdReturns404() {
        assertThat(mvc.get().uri("/api/employees/0199ffff-0000-7000-8000-000000000000"))
                .hasStatus(HttpStatus.NOT_FOUND);
    }

    // ── Deactivate / activate ────────────────────────────────────────

    @Test
    void deactivatedOnesOnlyAppearOnRequest() {
        create("Reto");
        String erich = idOf(create("Erich"));

        assertThat(send("POST", "/api/employees/" + erich + "/deactivate", null)).hasStatus(HttpStatus.OK);

        assertThat(mvc.get().uri("/api/employees"))
                .bodyJson().extractingPath("$[*].name").asArray().containsExactly("Chef", "Reto");
        assertThat(mvc.get().uri("/api/employees?includeInactive=true"))
                .bodyJson().extractingPath("$[*].name").asArray().containsExactly("Chef", "Reto", "Erich");
    }

    @Test
    void activateFailsIfNameTakenMeanwhile() {
        String oldReto = idOf(create("Reto"));
        send("POST", "/api/employees/" + oldReto + "/deactivate", null);
        create("Reto");

        MvcTestResult response = send("POST", "/api/employees/" + oldReto + "/activate", null);

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    // ── Order ────────────────────────────────────────────────────────

    @Test
    void reorderPutsGivenOnesFirstAndTheRestBehind() {
        create("Reto");
        String erich = idOf(create("Erich"));
        String doeme = idOf(create("Döme"));

        MvcTestResult response = send("PUT", "/api/employees/order", """
                { "ids": ["%s", "%s"] }
                """.formatted(doeme, erich));

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$[*].name").asArray().containsExactly("Döme", "Erich", "Chef", "Reto");
    }

    // ── Who am I? (person per device) ────────────────────────────────

    @Test
    void remembersWhoCreatedAndChanged() {
        MvcTestResult response = create("Reto");

        assertThat(response).bodyJson().extractingPath("$.updatedBy").isEqualTo(chef);
        assertThat(repository.findById(UUID.fromString(idOf(response))).orElseThrow().getCreatedBy())
                .hasToString(chef);
    }

    @Test
    void changeWithoutPersonIsRejected() {
        person = null; // e.g. TV in view-only mode

        MvcTestResult response = create("Reto");

        assertThat(response).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(response).bodyJson().extractingPath("$.title").isEqualTo("Keine Person gewählt");
    }

    @Test
    void changeFromDeactivatedPersonIsRejected() {
        String erich = idOf(create("Erich"));
        send("POST", "/api/employees/" + erich + "/deactivate", null);
        person = erich; // tablet on which Erich is still selected

        assertThat(create("Reto")).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void unknownOrBrokenPersonCountsAsNone() {
        person = "0199ffff-0000-7000-8000-000000000000";
        assertThat(create("Reto")).hasStatus(HttpStatus.FORBIDDEN);

        person = "broken";
        assertThat(create("Reto")).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void readingWorksWithoutPerson() {
        person = null;

        assertThat(mvc.get().uri("/api/employees")).hasStatus(HttpStatus.OK);
    }

    @Test
    void initialSetupWorksWithoutPerson() {
        TestDatabase.clear(jdbc); // nobody created yet → nobody can be selected
        person = null;

        MvcTestResult response = create("Reto");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.updatedBy").isNull();
    }

    // ── Live updates ─────────────────────────────────────────────────

    @Test
    void everyChangeIsAnnouncedAsLiveUpdate() {
        String id = idOf(create("Reto"));
        send("PUT", "/api/employees/" + id, request("Reto K.", 0));
        send("POST", "/api/employees/" + id + "/deactivate", null);

        assertThat(events.stream(DataChanged.class))
                .extracting(DataChanged::topic)
                .containsExactly("employees", "employees", "employees");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(String name) {
        return send("POST", "/api/employees", request(name, null));
    }

    private static String request(String name, Integer version) {
        return """
                { "name": "%s", "role": "MECHANIC", "color": "#9FC8F0", "birthday": "1995-05-18",
                  "vacationDaysPerYear": 20, "selectableAsMechanic": true, "selectableForTodos": true,
                  "hasPinboardColumn": true, "version": %s }
                """.formatted(name, version);
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        if (person != null) {
            request = request.header(CurrentPerson.HEADER, person);
        }
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private static String idOf(MvcTestResult response) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
