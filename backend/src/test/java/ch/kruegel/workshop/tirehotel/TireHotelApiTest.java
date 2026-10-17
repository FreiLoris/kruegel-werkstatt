package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** The tyre hotel from the outside (FB-07). Fictitious customers and tyres only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TireHotelApiTest {

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
    private Customer huber;
    private Vehicle golf;

    @BeforeEach
    void startWithACustomer() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        huber = customers.save(CustomerTestData.local("Huber"));
        golf = vehicles.save(Vehicle.local(huber, new VehicleDetails("ZH 123456", "VW", "Golf", null, null, null, null, null, null, null)));
    }

    @Test
    void storesASetWithItsDepthsAndKeepsThemInTheHistory() {
        MvcTestResult stored = store("""
                "season": "WINTER", "kind": "WHEELS", "rims": "ALU", "hubCaps": true,
                "brand": " Muster ", "dimension": "205/55 R16 91H", "year": 2022,
                "depths": { "frontLeft": 6.5, "frontRight": 6.5, "rearLeft": 5, "rearRight": null }""");

        assertThat(stored).hasStatus(HttpStatus.CREATED);
        assertThat(stored).bodyJson().extractingPath("$.brand").isEqualTo("Muster");
        assertThat(stored).bodyJson().extractingPath("$.vehicle.licensePlate").isEqualTo("ZH 123456");
        assertThat(stored).bodyJson().extractingPath("$.depths.rearLeft").isEqualTo(5.0);
        assertThat(stored).bodyJson().extractingPath("$.depths.rearRight").isNull();
        assertThat(stored).bodyJson().extractingPath("$.storedOn").isEqualTo(LocalDate.now().toString());
        assertThat(stored).bodyJson().extractingPath("$.retrievedOn").isNull();

        String id = idOf(stored);
        MvcTestResult history = mvc.get().uri("/api/tire-sets/" + id + "/history").exchange();
        assertThat(history).bodyJson().extractingPath("$[0].kind").isEqualTo("STORED");
        assertThat(history).bodyJson().extractingPath("$[0].depths.frontLeft").isEqualTo(6.5);
        assertThat(history).bodyJson().extractingPath("$[0].createdBy").isEqualTo(chef);
    }

    @Test
    void measuredAgainAndRetrievedTheHistoryShowsTheWear() {
        String id = idOf(store("\"season\": \"SUMMER\", \"kind\": \"TIRES\", \"storedOn\": \"2026-04-01\", "
                + "\"depths\": { \"frontLeft\": 5, \"frontRight\": 5, \"rearLeft\": 5, \"rearRight\": 5 }"));

        MvcTestResult measured = send("POST", "/api/tire-sets/" + id + "/measurements", """
                { "depths": { "frontLeft": 3.5, "frontRight": 3.4, "rearLeft": 4, "rearRight": 4 }, "on": "2026-10-01", "note": "Zettel 26-0001" }""");
        assertThat(measured).bodyJson().extractingPath("$.depths.frontRight").isEqualTo(3.4);

        MvcTestResult retrieved = send("POST", "/api/tire-sets/" + id + "/retrieve", "{ \"on\": \"2026-10-02\" }");
        assertThat(retrieved).bodyJson().extractingPath("$.retrievedOn").isEqualTo("2026-10-02");
        assertThat(send("POST", "/api/tire-sets/" + id + "/retrieve", "{}")).hasStatus(HttpStatus.CONFLICT);

        assertThat(mvc.get().uri("/api/tire-sets/" + id + "/history").exchange()).bodyJson().extractingPath("$[*].kind").asArray()
                .containsExactly("STORED", "MEASURED", "RETRIEVED");
        // out of the hotel: in the other list
        assertThat(mvc.get().uri("/api/tire-sets").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(mvc.get().uri("/api/tire-sets?inHotel=false").exchange()).bodyJson().extractingPath("$[0].id").isEqualTo(id);
    }

    @Test
    void checksRimsDaysAndDepths() {
        assertFieldError(store("\"season\": \"SUMMER\", \"kind\": \"TIRES\", \"rims\": \"ALU\""), "rims");
        assertFieldError(store("\"season\": \"SUMMER\", \"kind\": \"TIRES\", \"storedOn\": \"" + LocalDate.now().plusDays(1) + "\""), "storedOn");
        assertFieldError(store("\"season\": \"SUMMER\", \"kind\": \"TIRES\", \"depths\": { \"frontLeft\": 25 }"), "depths.frontLeft");
        assertFieldError(store("\"season\": \"SUMMER\", \"kind\": \"TIRES\", \"depths\": { \"frontLeft\": 4.25 }"), "depths.frontLeft");

        String id = idOf(store("\"season\": \"SUMMER\", \"kind\": \"TIRES\", \"storedOn\": \"2026-04-01\""));
        assertFieldError(send("POST", "/api/tire-sets/" + id + "/measurements", "{ \"depths\": {}, \"on\": \"2026-03-01\" }"), "on");
        // nothing measured would wipe the last depths
        assertFieldError(send("POST", "/api/tire-sets/" + id + "/measurements", "{ \"depths\": {} }"), "depths");
    }

    @Test
    void editingChangesTheDataNotTheDepths() {
        String id = idOf(store("\"season\": \"WINTER\", \"kind\": \"WHEELS\", \"depths\": { \"frontLeft\": 6 }"));

        MvcTestResult edited = send("PUT", "/api/tire-sets/" + id, body("""
                "season": "ALL_SEASON", "kind": "WHEELS", "rims": "STEEL", "remark": "Felge HL mit Delle", "depths": { "frontLeft": 1 }, "version": 0"""));

        assertThat(edited).bodyJson().extractingPath("$.season").isEqualTo("ALL_SEASON");
        assertThat(edited).bodyJson().extractingPath("$.remark").isEqualTo("Felge HL mit Delle");
        assertThat(edited).bodyJson().extractingPath("$.depths.frontLeft").isEqualTo(6.0);
        assertFieldError(send("PUT", "/api/tire-sets/" + id, body("\"season\": \"SUMMER\", \"kind\": \"TIRES\"")), "version");
    }

    @Test
    void theTreadLimitsCanBeChangedButTheMinimumStaysBelow() {
        MvcTestResult limits = mvc.get().uri("/api/tire-hotel-settings").exchange();
        assertThat(limits).bodyJson().extractingPath("$.winterMm").isEqualTo(4.0);
        assertThat(limits).bodyJson().extractingPath("$.minimumMm").isEqualTo(1.6);

        assertThat(send("PUT", "/api/tire-hotel-settings", "{ \"summerMm\": 3.5, \"winterMm\": 4, \"minimumMm\": 1.6, \"version\": 0 }"))
                .bodyJson().extractingPath("$.summerMm").isEqualTo(3.5);
        assertFieldError(send("PUT", "/api/tire-hotel-settings", "{ \"summerMm\": 3, \"winterMm\": 4, \"minimumMm\": 3.5, \"version\": 1 }"),
                "minimumMm");
    }

    private MvcTestResult store(String fields) {
        return send("POST", "/api/tire-sets", body(fields));
    }

    /** A set of Huber's Golf plus the given JSON fields. */
    private String body(String fields) {
        return "{ \"customerId\": \"%s\", \"vehicleId\": \"%s\", %s }".formatted(huber.getId(), golf.getId(), fields);
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        return request.header(CurrentPerson.HEADER, chef).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
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
