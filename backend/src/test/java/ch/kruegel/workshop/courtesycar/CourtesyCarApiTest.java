package ch.kruegel.workshop.courtesycar;

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
import java.time.Clock;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Courtesy car API from the outside, with a real database. Changes are made as person "Chef". */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class CourtesyCarApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private Clock clock;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void createsWithAllDetails() {
        MvcTestResult response = send("POST", "/api/courtesy-cars",
                request("Ersatzwagen 1", "VW Polo", " zh 10001 ", "2027-03-01", "2027-12-31", null));

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.licensePlate").isEqualTo("ZH 10001");
        assertThat(response).bodyJson().extractingPath("$.model").isEqualTo("VW Polo");
        assertThat(response).bodyJson().extractingPath("$.updatedBy").isEqualTo(chef);
    }

    @Test
    void onlyNameIsRequired() {
        MvcTestResult response = send("POST", "/api/courtesy-cars", "{ \"name\": \"Ersatzwagen 1\" }");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.licensePlate").isNull();
        assertThat(response).bodyJson().extractingPath("$.serviceStatus").isNull();
    }

    @Test
    void reportsDueStatusRelativeToToday() {
        LocalDate today = LocalDate.now(clock);

        MvcTestResult response = send("POST", "/api/courtesy-cars",
                request("Ersatzwagen 1", null, null, today.minusDays(1).toString(), today.plusDays(10).toString(), null));

        assertThat(response).bodyJson().extractingPath("$.serviceStatus").isEqualTo("OVERDUE");
        assertThat(response).bodyJson().extractingPath("$.insuranceStatus").isEqualTo("DUE_SOON");
    }

    @Test
    void duplicateNameIsFieldError() {
        create("Ersatzwagen 1", "ZH 10001");

        MvcTestResult response = create("ERSATZWAGEN 1", "ZH 10002");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    @Test
    void duplicateLicensePlateIsFieldError() {
        create("Ersatzwagen 1", "ZH 10001");

        MvcTestResult response = create("Ersatzwagen 2", "zh  10001");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("licensePlate");
    }

    @Test
    void editWithVersionAndKeepOwnPlate() {
        String id = idOf(create("Ersatzwagen 1", "ZH 10001"));

        MvcTestResult response = send("PUT", "/api/courtesy-cars/" + id,
                request("Ersatzwagen 1", "VW Polo GTI", "ZH 10001", null, null, 0));

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.model").isEqualTo("VW Polo GTI");
        assertThat(send("PUT", "/api/courtesy-cars/" + id, request("Ersatzwagen 1", null, null, null, null, 0)))
                .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void deactivatedCarFreesItsPlate() {
        String old = idOf(create("Ersatzwagen 1", "ZH 10001"));
        assertThat(send("POST", "/api/courtesy-cars/" + old + "/deactivate", null)).hasStatus(HttpStatus.OK);

        assertThat(create("Ersatzwagen neu", "ZH 10001")).hasStatus(HttpStatus.CREATED);
        assertThat(mvc.get().uri("/api/courtesy-cars")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Ersatzwagen neu");
        // Reactivating would create a duplicate plate → field error
        assertThat(send("POST", "/api/courtesy-cars/" + old + "/activate", null)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void changesAreAnnouncedAsLiveUpdate() {
        create("Ersatzwagen 1", null);

        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).containsExactly("courtesy-cars");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(String name, String plate) {
        return send("POST", "/api/courtesy-cars", request(name, null, plate, null, null, null));
    }

    private static String request(String name, String model, String plate, String serviceDue, String insuranceUntil, Integer version) {
        return """
                { "name": %s, "model": %s, "licensePlate": %s, "serviceDue": %s, "insuranceUntil": %s, "version": %s }
                """.formatted(json(name), json(model), json(plate), json(serviceDue), json(insuranceUntil), version);
    }

    private static String json(String value) {
        return value == null ? "null" : "\"" + value + "\"";
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
