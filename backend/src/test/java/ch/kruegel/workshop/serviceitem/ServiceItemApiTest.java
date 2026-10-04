package ch.kruegel.workshop.serviceitem;

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

/** Service items API from the outside, with a real database. Changes are made as person "Chef". */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class ServiceItemApiTest {

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
    void newItemGoesToTheEnd() {
        create("Ölwechsel");
        MvcTestResult response = create("  Reifen einlagern  ");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Reifen einlagern");
        assertThat(response).bodyJson().extractingPath("$.updatedBy").isEqualTo(chef);
        assertThat(mvc.get().uri("/api/service-items")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Ölwechsel", "Reifen einlagern");
    }

    @Test
    void duplicateNameIsFieldError() {
        create("Ölwechsel");

        MvcTestResult response = create("ÖLWECHSEL");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    @Test
    void renameToExistingNameIsFieldError() {
        create("Ölwechsel");
        String id = idOf(create("Bremsen"));

        MvcTestResult response = send("PUT", "/api/service-items/" + id, "{ \"name\": \" ölwechsel \", \"version\": 0 }");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    @Test
    void renameWithVersion() {
        String id = idOf(create("Oelwechsel"));

        MvcTestResult response = send("PUT", "/api/service-items/" + id, "{ \"name\": \"Ölwechsel\", \"version\": 0 }");

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Ölwechsel");
        assertThat(send("PUT", "/api/service-items/" + id, "{ \"name\": \"Öl\", \"version\": 0 }"))
                .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void allMayBeDeactivated() {
        // Unlike lifts: a task works without any service item
        String only = idOf(create("Ölwechsel"));

        assertThat(send("POST", "/api/service-items/" + only + "/deactivate", null)).hasStatus(HttpStatus.OK);

        assertThat(mvc.get().uri("/api/service-items")).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(mvc.get().uri("/api/service-items?includeInactive=true")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Ölwechsel");
    }

    @Test
    void reorder() {
        String oil = idOf(create("Ölwechsel"));
        create("Bremsen");
        String aircon = idOf(create("Klimaservice"));

        MvcTestResult response = send("PUT", "/api/service-items/order", "{ \"ids\": [\"%s\", \"%s\"] }".formatted(aircon, oil));

        assertThat(response).bodyJson().extractingPath("$[*].name").asArray().containsExactly("Klimaservice", "Ölwechsel", "Bremsen");
    }

    @Test
    void changesAreAnnouncedAsLiveUpdate() {
        create("Ölwechsel");

        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).containsExactly("service-items");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(String name) {
        return send("POST", "/api/service-items", "{ \"name\": \"%s\" }".formatted(name));
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
