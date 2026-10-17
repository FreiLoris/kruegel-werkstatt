package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
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

/** Locations and places of the tyre hotel, and sets on them (FB-07). Fictitious customers only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@RecordApplicationEvents
class TireLocationApiTest {

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private Customer huber;
    private Customer muster;

    @BeforeEach
    void start() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        huber = customers.save(CustomerTestData.local("Huber"));
        muster = customers.save(CustomerTestData.local("Muster"));
    }

    @Test
    void thePlacesAreGeneratedFromTheSizes() {
        MvcTestResult floor = send("POST", "/api/tire-locations", location(" og ", "FLOOR", 2, 2, 2, null));
        assertThat(floor).hasStatus(HttpStatus.CREATED);
        assertThat(floor).bodyJson().extractingPath("$.code").isEqualTo("OG");
        send("POST", "/api/tire-locations", location("CT", "SHELVES", 1, 2, 2, null));

        MvcTestResult places = mvc.get().uri("/api/tire-places").exchange();
        assertThat(places).bodyJson().extractingPath("$[*].address").asArray().containsExactly(
                "OG-A1-1", "OG-A1-2", "OG-A2-1", "OG-A2-2", "OG-B1-1", "OG-B1-2", "OG-B2-1", "OG-B2-2",
                "CT-R1-E1-F1", "CT-R1-E1-F2", "CT-R1-E2-F1", "CT-R1-E2-F2");

        assertFieldError(send("POST", "/api/tire-locations", location("OG", "SHELVES", 1, 1, 1, null)), "code");
        assertFieldError(send("POST", "/api/tire-locations", location("O-G", "FLOOR", 1, 1, 1, null)), "code");
        assertFieldError(send("POST", "/api/tire-locations", location("XX", "FLOOR", 27, 1, 1, null)), "sizeA");
        // a usable place view: at most 500 places
        assertFieldError(send("POST", "/api/tire-locations", location("XX", "FLOOR", 26, 30, 2, null)), "sizeC");
    }

    @Test
    void aSetTakesOnePlaceMovesAndFreesItWhenRetrieved() {
        send("POST", "/api/tire-locations", location("OG", "FLOOR", 1, 1, 2, null));
        String first = placeId("OG-A1-1");
        String second = placeId("OG-A1-2");

        String set = idOf(store(huber, first));
        assertThat(mvc.get().uri("/api/tire-sets/" + set).exchange()).bodyJson().extractingPath("$.place").isEqualTo("OG-A1-1");
        // taken – says by whom
        MvcTestResult taken = store(muster, first);
        assertFieldError(taken, "placeId");
        assertThat(taken).bodyJson().extractingPath("$.errors[0].message").asString().isEqualTo("OG-A1-1 ist belegt (Huber Test)");

        MvcTestResult moved = send("POST", "/api/tire-sets/" + set + "/move", "{ \"placeId\": \"%s\", \"note\": \"Platz frei machen\" }".formatted(second));
        assertThat(moved).bodyJson().extractingPath("$.place").isEqualTo("OG-A1-2");
        assertThat(store(muster, first)).hasStatus(HttpStatus.CREATED);
        // editing does not move – that goes into the history by "Umlagern"
        assertFieldError(send("PUT", "/api/tire-sets/" + set, """
                { "customerId": "%s", "season": "WINTER", "kind": "WHEELS", "placeId": "%s", "version": 1 }""".formatted(huber.getId(), first)),
                "placeId");

        send("POST", "/api/tire-sets/" + set + "/retrieve", "{}");
        assertThat(mvc.get().uri("/api/tire-sets/" + set + "/history").exchange()).bodyJson().extractingPath("$[*].place").asArray()
                .containsExactly("OG-A1-1", "OG-A1-2", "OG-A1-2");
        // retrieved: the place is free again
        assertThat(store(huber, second)).hasStatus(HttpStatus.CREATED);
        assertThat(mvc.get().uri("/api/tire-sets/" + set).exchange()).bodyJson().extractingPath("$.place").isNull();
    }

    @Test
    void aNewCodeAlsoTellsTheTyreHotelList() {
        String og = idOf(send("POST", "/api/tire-locations", location("OG", "FLOOR", 1, 1, 1, null)));
        events.clear();

        send("PUT", "/api/tire-locations/" + og, location("W1", "FLOOR", 1, 1, 1, 0L));

        // the sets show their address – it changed with the code
        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).contains("tire-locations", "tire-sets");
    }

    @Test
    void smallerOnlyWhereNoSetLiesAndTheCodeRenamesTheAddresses() {
        String og = idOf(send("POST", "/api/tire-locations", location("OG", "FLOOR", 2, 1, 1, null)));
        String set = idOf(store(huber, placeId("OG-B1-1")));

        assertFieldError(send("PUT", "/api/tire-locations/" + og, location("OG", "FLOOR", 1, 1, 1, 0L)), "sizeA");

        send("POST", "/api/tire-sets/" + set + "/move", "{ \"placeId\": \"%s\" }".formatted(placeId("OG-A1-1")));
        assertThat(send("PUT", "/api/tire-locations/" + og, location("W1", "FLOOR", 1, 2, 1, 0L))).hasStatusOk();

        MvcTestResult places = mvc.get().uri("/api/tire-places").exchange();
        assertThat(places).bodyJson().extractingPath("$[*].address").asArray().containsExactly("W1-A1-1", "W1-A2-1", "W1-B1-1");
        // the column B is no longer used – kept, the history may name it
        assertThat(places).bodyJson().extractingPath("$[?(@.address == 'W1-B1-1')].active").asArray().containsExactly(false);
        assertThat(mvc.get().uri("/api/tire-sets/" + set).exchange()).bodyJson().extractingPath("$.place").isEqualTo("W1-A1-1");
        assertFieldError(store(muster, placeId("W1-B1-1")), "placeId");

        // not deleted while a set lies there
        assertThat(send("DELETE", "/api/tire-locations/" + og, null)).hasStatus(HttpStatus.CONFLICT);
        send("POST", "/api/tire-sets/" + set + "/retrieve", "{}");
        assertThat(send("DELETE", "/api/tire-locations/" + og, null)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.get().uri("/api/tire-places").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
    }

    private String placeId(String address) {
        return jdbc.queryForObject("SELECT id::text FROM tire_place WHERE address = ?", String.class, address);
    }

    private MvcTestResult store(Customer customer, String placeId) {
        return send("POST", "/api/tire-sets", """
                { "customerId": "%s", "season": "WINTER", "kind": "WHEELS", "placeId": "%s" }""".formatted(customer.getId(), placeId));
    }

    private static String location(String code, String kind, int a, int b, int c, Long version) {
        return """
                { "code": "%s", "name": "Werkstatt", "kind": "%s", "sizeA": %d, "sizeB": %d, "sizeC": %d, "version": %s }"""
                .formatted(code, kind, a, b, c, version);
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            case "DELETE" -> mvc.delete().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        request = request.header(CurrentPerson.HEADER, chef);
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private static void assertFieldError(MvcTestResult response, String field) {
        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[*].field").asArray().contains(field);
    }

    private static String idOf(MvcTestResult response) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
