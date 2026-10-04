package ch.kruegel.workshop.lift;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
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

/** Lift API from the outside, with a real database. Changes are made as person "Chef". */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class LiftApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void newLiftGoesToTheEnd() {
        create("Lift 1");
        MvcTestResult response = create("  Grube  ");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Grube");
        assertThat(response).bodyJson().extractingPath("$.updatedBy").isEqualTo(chef);
        assertThat(mvc.get().uri("/api/lifts")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Lift 1", "Grube");
    }

    @Test
    void duplicateNameIsFieldError() {
        create("Lift 1");

        MvcTestResult response = create("LIFT 1");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    @Test
    void renameToExistingNameIsFieldError() {
        create("Lift 1");
        String id = idOf(create("Lift 2"));

        MvcTestResult response = send("PUT", "/api/lifts/" + id, "{ \"name\": \" lift 1 \", \"version\": 0 }");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    @Test
    void renameWithVersion() {
        String id = idOf(create("Lift 1"));

        MvcTestResult response = send("PUT", "/api/lifts/" + id, "{ \"name\": \"Lift A\", \"version\": 0 }");

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Lift A");
        assertThat(send("PUT", "/api/lifts/" + id, "{ \"name\": \"Lift B\", \"version\": 0 }"))
                .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void decommissionedOnesOnlyAppearOnRequest() {
        create("Lift 1");
        String two = idOf(create("Lift 2"));

        assertThat(send("POST", "/api/lifts/" + two + "/deactivate", null)).hasStatus(HttpStatus.OK);

        assertThat(mvc.get().uri("/api/lifts")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Lift 1");
        assertThat(mvc.get().uri("/api/lifts?includeInactive=true")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Lift 1", "Lift 2");
    }

    @Test
    void lastActiveLiftStays() {
        String only = idOf(create("Lift 1"));

        MvcTestResult response = send("POST", "/api/lifts/" + only + "/deactivate", null);

        assertThat(response).hasStatus(HttpStatus.CONFLICT);
        assertThat(response).bodyJson().extractingPath("$.detail").isEqualTo("Mindestens ein Lift muss in Betrieb bleiben.");
    }

    @Test
    void reorder() {
        String one = idOf(create("Lift 1"));
        create("Lift 2");
        String three = idOf(create("Lift 3"));

        MvcTestResult response = send("PUT", "/api/lifts/order", "{ \"ids\": [\"%s\", \"%s\"] }".formatted(three, one));

        assertThat(response).bodyJson().extractingPath("$[*].name").asArray().containsExactly("Lift 3", "Lift 1", "Lift 2");
    }

    @Test
    void changesAreAnnouncedAsLiveUpdate() {
        create("Lift 1");

        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).containsExactly("lifts");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(String name) {
        return send("POST", "/api/lifts", "{ \"name\": \"%s\" }".formatted(name));
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        request = request.header(CurrentPerson.HEADER, chef);
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
