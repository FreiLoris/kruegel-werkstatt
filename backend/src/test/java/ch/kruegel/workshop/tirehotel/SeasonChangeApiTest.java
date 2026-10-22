package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.config.TimeConfig;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
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
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The season change overview (FB-21), today being 23 October 2026: the winter change, counting
 * from 1 June. Fictitious customers and tyres only.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SeasonChangeApiTest {

    private static final String DAY = "2026-10-23";

    // "today" of the acknowledgements – the season they are for
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-10-23T08:00:00Z"), TimeConfig.TIME_ZONE);
    }

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private VehicleRepository vehicles;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void start() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void eachSetInItsGroup() {
        Vehicle changed = car("Huber", "ZH 1");
        store(changed, "SUMMER", "2026-10-16");
        Vehicle mounted = car("Meier", "ZH 2");
        String meierWinter = store(mounted, "WINTER", "2026-04-10");
        assertThat(send("POST", "/api/tire-sets/" + meierWinter + "/retrieve", "{ \"on\": \"2026-10-20\" }")).hasStatusOk();
        Vehicle open = car("Keller", "ZH 3");
        store(open, "WINTER", "2026-04-01");
        Vehicle planned = car("Frei", "ZH 4");
        store(planned, "WINTER", "2026-04-02");
        task(planned, "2026-11-05");
        Vehicle forgotten = car("Strassmann", "ZH 5");
        store(forgotten, "SUMMER", "2025-12-10");
        Vehicle both = car("Frischknecht", "ZH 6");
        store(both, "SUMMER", "2025-11-03");
        store(both, "WINTER", "2026-04-03");
        store(car("Ganz", "ZH 7"), "ALL_SEASON", "2026-04-04");

        MvcTestResult overview = overview();

        assertThat(overview).bodyJson().extractingPath("$.season").isEqualTo("WINTER");
        assertThat(overview).bodyJson().extractingPath("$.deadline").isEqualTo("2026-12-01");
        assertThat(overview).bodyJson().extractingPath("$.overdue").isEqualTo(false);
        List<Map<String, Object>> entries = read(overview, "$.entries[*]");
        assertThat(entries).extracting(e -> name(e) + ":" + e.get("group")).containsExactly(
                "Frei:PLANNED", "Frischknecht:OPEN", "Frischknecht:LONG_STORED", "Huber:CHANGED", "Keller:OPEN",
                "Meier:CHANGED", "Strassmann:LONG_STORED");
        assertThat(read(overview, "$.entries[3].changedOn").toString()).isEqualTo("2026-10-16");
        assertThat(read(overview, "$.entries[5].changedOn").toString()).isEqualTo("2026-10-20");
        assertThat(read(overview, "$.entries[0].planned.date").toString()).isEqualTo("2026-11-05");
        assertThat(entries).extracting(e -> e.get("bothStored")).containsExactly(false, true, true, false, false, false, false);
    }

    @Test
    void acknowledgedForThisSeasonOnly_andUndone() {
        String kellerWinter = store(car("Keller", "ZH 3"), "WINTER", "2026-04-01");

        // "Quittieren": it stays out of "Offen" – for this season only, and undone again
        MvcTestResult ack = send("POST", "/api/tire-season/acks",
                "{ \"tireSetId\": \"%s\", \"deadline\": \"2026-12-01\", \"reason\": \" Fährt Reifen herunter \" }".formatted(kellerWinter));
        assertThat(ack).hasStatus(HttpStatus.CREATED);
        assertThat(ack).bodyJson().extractingPath("$.reason").isEqualTo("Fährt Reifen herunter");
        assertThat(ack).bodyJson().extractingPath("$.by").isEqualTo(chef);
        assertThat(groupOf(overview(), kellerWinter)).isEqualTo("ACKNOWLEDGED");
        assertThat(groupOf(overview("2027-04-10"), kellerWinter)).isNotEqualTo("ACKNOWLEDGED");

        assertThat(send("POST", "/api/tire-season/acks", "{ \"tireSetId\": \"%s\", \"deadline\": \"2026-12-01\" }".formatted(kellerWinter)))
                .hasStatus(HttpStatus.CONFLICT);
        assertThat(mvc.delete().uri("/api/tire-season/acks/" + read(ack, "$.id")).header(CurrentPerson.HEADER, chef).exchange())
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(groupOf(overview(), kellerWinter)).isEqualTo("OPEN");
    }

    @Test
    void anOldThirdSetOfAChangedCarStillShows() {
        Vehicle car = car("Huber", "ZH 1");
        String summer = store(car, "SUMMER", "2026-10-16");
        String old = store(car, "SUMMER", "2024-10-01");

        MvcTestResult overview = overview();

        assertThat(groupOf(overview, summer)).isEqualTo("CHANGED");
        assertThat(groupOf(overview, old)).isEqualTo("LONG_STORED");
    }

    @Test
    void movingTheDeadlineTakesTheAcknowledgementsAlong() {
        String set = store(car("Keller", "ZH 3"), "WINTER", "2026-04-01");
        assertThat(send("POST", "/api/tire-season/acks", "{ \"tireSetId\": \"%s\", \"deadline\": \"2026-12-01\" }".formatted(set)))
                .hasStatus(HttpStatus.CREATED);

        assertThat(send("PUT", "/api/tire-season-settings", "{ \"summerDeadline\": \"06-01\", \"winterDeadline\": \"11-15\", \"version\": %d }"
                .formatted(settingsVersion()))).hasStatusOk();

        assertThat(groupOf(overview(), set)).isEqualTo("ACKNOWLEDGED");
    }

    @Test
    void afterTheDeadlineStillOpenIsOverdue() {
        store(car("Keller", "ZH 3"), "WINTER", "2026-04-01");

        MvcTestResult overview = overview("2027-01-10");

        assertThat(overview).bodyJson().extractingPath("$.overdue").isEqualTo(true);
        assertThat(overview).bodyJson().extractingPath("$.entries[0].group").isEqualTo("OPEN");
    }

    @Test
    void acknowledgedOnlyForTheSeasonShown_andOnlySetsTakingPart() {
        String set = store(car("Keller", "ZH 3"), "WINTER", "2026-04-01");
        String allSeason = store(car("Ganz", "ZH 7"), "ALL_SEASON", "2026-04-04");

        // a page left open since last season
        assertThat(send("POST", "/api/tire-season/acks", "{ \"tireSetId\": \"%s\", \"deadline\": \"2026-06-01\" }".formatted(set)))
                .hasStatus(HttpStatus.CONFLICT);
        assertThat(send("POST", "/api/tire-season/acks", "{ \"tireSetId\": \"%s\", \"deadline\": \"2026-12-01\" }".formatted(allSeason)))
                .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void deadlinesChangeable_butRealDays() {
        long version = settingsVersion();

        MvcTestResult changed = send("PUT", "/api/tire-season-settings",
                "{ \"summerDeadline\": \"05-15\", \"winterDeadline\": \"11-15\", \"version\": %d }".formatted(version));
        assertThat(changed).hasStatusOk();
        assertThat(overview()).bodyJson().extractingPath("$.deadline").isEqualTo("2026-11-15");

        long next = ((Number) read(changed, "$.version")).longValue();
        assertThat(send("PUT", "/api/tire-season-settings", "{ \"summerDeadline\": \"02-30\", \"winterDeadline\": \"11-15\", \"version\": %d }".formatted(next)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send("PUT", "/api/tire-season-settings", "{ \"summerDeadline\": \"10-01\", \"winterDeadline\": \"11-15\", \"version\": %d }".formatted(next)))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    private Vehicle car(String lastName, String plate) {
        Customer customer = customers.save(CustomerTestData.local(lastName));
        return vehicles.save(Vehicle.local(customer, new VehicleDetails(plate, "VW", "Golf", null, null, null, null, null, null, null)));
    }

    private String store(Vehicle vehicle, String season, String storedOn) {
        MvcTestResult response = send("POST", "/api/tire-sets", """
                { "customerId": "%s", "vehicleId": "%s", "season": "%s", "kind": "WHEELS", "storedOn": "%s" }"""
                .formatted(vehicle.getCustomer().getId(), vehicle.getId(), season, storedOn));
        assertThat(response).hasStatus(HttpStatus.CREATED);
        return read(response, "$.id");
    }

    private void task(Vehicle vehicle, String date) {
        assertThat(send("POST", "/api/tasks", """
                { "customerId": "%s", "vehicleId": "%s", "acceptedById": "%s", "date": "%s", "time": "08:00", "tireChange": true }"""
                .formatted(vehicle.getCustomer().getId(), vehicle.getId(), chef, date))).hasStatus(HttpStatus.CREATED);
    }

    private long settingsVersion() {
        return ((Number) read(mvc.get().uri("/api/tire-season-settings").exchange(), "$.version")).longValue();
    }

    private static String groupOf(MvcTestResult overview, String setId) {
        List<String> groups = read(overview, "$.entries[?(@.set.id == '%s')].group".formatted(setId));
        assertThat(groups).hasSize(1);
        return groups.getFirst();
    }

    private MvcTestResult overview() {
        return overview(DAY);
    }

    private MvcTestResult overview(String day) {
        return mvc.get().uri("/api/tire-season?day=" + day).exchange();
    }

    private static String name(Map<String, Object> entry) {
        String lastName = JsonPath.read(entry, "$.set.customer.lastName");
        return lastName;
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        return request.header(CurrentPerson.HEADER, chef).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private static <T> T read(MvcTestResult response, String path) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), path);
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
